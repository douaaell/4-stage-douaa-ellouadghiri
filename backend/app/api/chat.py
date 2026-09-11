"""
Chat endpoint — the core RAG interaction.
"""
import json
import logging
import os
import re
import math
from collections import Counter
from typing import List, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.conversation import Conversation, Message
from app.models.document import Document
from app.models.user import User
from app.schemas.schemas import ChatRequest, ChatResponse, SourceInfo
from app.core.dependencies import get_current_user
from app.core.config import settings

router = APIRouter(prefix="/chat", tags=["Chat"])

logger = logging.getLogger(__name__)


# ─── Lightweight RAG pipeline (no ChromaDB C++ dependency) ────────────

def _extract_pdf_chunks(file_path: str, chunk_size: int = 1800, chunk_overlap: int = 350) -> List[Dict]:
    """Extract text from a PDF and split into rich chunks (1800 chars, 350 overlap). Pure Python."""
    try:
        import pdfplumber
        pages = []
        with pdfplumber.open(file_path) as pdf:
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text and text.strip():
                    pages.append({"page": i + 1, "text": text.strip()})
    except Exception:
        try:
            from PyPDF2 import PdfReader
            pages = []
            reader = PdfReader(file_path)
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text and text.strip():
                    pages.append({"page": i + 1, "text": text.strip()})
        except Exception:
            return []

    # Split pages into larger, contextual chunks
    chunks = []
    chunk_index = 0
    for page_data in pages:
        text = page_data["text"]
        start = 0
        while start < len(text):
            end = min(start + chunk_size, len(text))
            chunk = text[start:end].strip()
            if chunk:
                chunks.append({
                    "text": chunk,
                    "page": page_data["page"],
                    "chunk_index": chunk_index,
                })
                chunk_index += 1
            start += chunk_size - chunk_overlap
    return chunks


def _tokenize(text: str) -> List[str]:
    """Simple tokenizer for French text."""
    return re.findall(r'\b\w{2,}\b', text.lower())


def _search_chunks(question: str, all_chunks: List[Dict], top_k: int = 5) -> List[Dict]:
    """
    TF-IDF style keyword search to find the top_k most relevant chunks.
    Conserves score and metadata for adjacent neighbor merging.
    """
    if not all_chunks:
        return []

    query_tokens = set(_tokenize(question))
    if not query_tokens:
        return []

    # Stopwords français courants pour éviter que des mots génériques faussent le calcul
    STOPWORDS = {"le", "la", "les", "un", "une", "des", "du", "de", "ce", "cet", "cette", "ces", "dans", "pour", "par", "sur", "avec", "sans", "est", "sont", "ete", "etre", "avoir", "quel", "quelle", "quelles", "quels", "qui", "que", "quoi", "selon", "est-ce"}
    effective_query_tokens = {t for t in query_tokens if t not in STOPWORDS}
    if not effective_query_tokens:
        effective_query_tokens = query_tokens

    # IDF: how rare is each query term across chunks
    doc_freq = Counter()
    chunk_token_lists = []
    for chunk in all_chunks:
        tokens = set(_tokenize(chunk["text"]))
        chunk_token_lists.append(tokens)
        for t in effective_query_tokens:
            if t in tokens:
                doc_freq[t] += 1

    n = len(all_chunks)
    scored = []
    for i, chunk in enumerate(all_chunks):
        tokens = chunk_token_lists[i]
        score = 0.0
        for t in effective_query_tokens:
            if t in tokens:
                idf = math.log((n + 1) / (doc_freq.get(t, 0) + 1)) + 1
                score += idf
        if score > 0:
            chunk_copy = dict(chunk)
            chunk_copy["score"] = score
            scored.append((score, chunk_copy))

    scored.sort(key=lambda x: x[0], reverse=True)
    if not scored:
        return []

    max_score = scored[0][0]
    # Retenir uniquement les chunks avec un score significatif (au moins 35% du score maximal)
    relevant = [item[1] for item in scored[:top_k] if item[0] >= max_score * 0.35]
    return relevant if relevant else [scored[0][1]]


def _merge_adjacent_chunks(chunks: List[Dict]) -> List[Dict]:
    """
    Conserve le contexte des passages voisins :
    Si deux ou plusieurs chunks sélectionnés appartiennent au même document
    et à la même page ou à des pages consécutives, les fusionne pour préserver
    la continuité des étapes de la procédure sans coupure.
    """
    if not chunks:
        return []

    # Grouper par document
    docs_map: Dict[str, List[Dict]] = {}
    for c in chunks:
        d_name = c.get("document_name", "doc")
        docs_map.setdefault(d_name, []).append(c)

    merged_chunks = []

    for d_name, doc_chunks in docs_map.items():
        # Trier par page puis par chunk_index
        doc_chunks.sort(key=lambda x: (x.get("page", 0), x.get("chunk_index", 0)))
        
        current = None
        for c in doc_chunks:
            if current is None:
                current = dict(c)
                continue

            curr_page = current.get("page")
            next_page = c.get("page")
            curr_idx = current.get("chunk_index", 0)
            next_idx = c.get("chunk_index", 0)

            is_same_page = (curr_page == next_page)
            is_consecutive_page = isinstance(curr_page, int) and isinstance(next_page, int) and (next_page - curr_page == 1)
            is_adjacent = (next_idx - curr_idx in [0, 1, 2])

            if is_same_page or (is_consecutive_page and is_adjacent):
                # Fusionner les deux textes en évitant la duplication de chevauchement
                t1 = current["text"]
                t2 = c["text"]
                overlap_merged = False
                for ol in range(min(len(t1), len(t2), 400), 40, -1):
                    if t1.endswith(t2[:ol]):
                        current["text"] = t1 + t2[ol:]
                        overlap_merged = True
                        break
                if not overlap_merged:
                    current["text"] = t1 + "\n\n" + t2

                if not is_same_page:
                    current["page"] = f"{curr_page} et {next_page}"
                current["score"] = max(current.get("score", 0), c.get("score", 0))
                current["chunk_index"] = next_idx
            else:
                merged_chunks.append(current)
                current = dict(c)

        if current is not None:
            merged_chunks.append(current)

    # Réordonner par pertinence
    merged_chunks.sort(key=lambda x: x.get("score", 0), reverse=True)
    return merged_chunks


def _call_ollama_http(prompt: str) -> str:
    """Call Ollama via its REST API directly — no langchain, no numpy, no C++ deps."""
    import urllib.request
    import urllib.error

    url = f"{settings.OLLAMA_BASE_URL}/api/generate"
    payload = json.dumps({
        "model": settings.OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.1,  # Précision maximale et stricte fidélité
            "num_ctx": 2048,     # Contexte borné pour vitesse maximale sur CPU
            "num_predict": 600,  # ~350-450 mots : amplement suffisant et rapide
        }
    }).encode("utf-8")

    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("response", "")
    except urllib.error.URLError as e:
        raise ConnectionError(
            f"Impossible de contacter Ollama sur {settings.OLLAMA_BASE_URL}. "
            f"Vérifiez qu'Ollama est lancé. Erreur : {e}"
        )


_PDF_CHUNKS_CACHE: Dict[str, tuple] = {}


def _get_document_chunks(file_path: str, doc_name: str) -> List[Dict]:
    """Extract and cache PDF chunks to make searches fast and reliable."""
    if not os.path.exists(file_path):
        return []
    try:
        mtime = os.path.getmtime(file_path)
        if file_path in _PDF_CHUNKS_CACHE and _PDF_CHUNKS_CACHE[file_path][0] == mtime:
            return _PDF_CHUNKS_CACHE[file_path][1]
        chunks = _extract_pdf_chunks(file_path, chunk_size=1800, chunk_overlap=350)
        for chunk in chunks:
            chunk["document_name"] = doc_name
        _PDF_CHUNKS_CACHE[file_path] = (mtime, chunks)
        return chunks
    except Exception as e:
        logger.error(f"Erreur d'extraction pour {file_path} : {e}")
        return []


def _generate_rag_response(question: str, db: Session) -> dict:
    """
    Pipeline RAG enrichi et pédagogique :
    1. Chunks élargis (1800 caractères) et recherche top_k=5 ciblée
    2. Fusion intelligente des passages voisins (continuité procédurale)
    3. Prompt structuré et exigeant (exactitude, explications, fidélité stricte)
    4. Filtrage précis des sources réellement utiles
    """
    retrieved_docs = []

    # ── Étape 1 : Recherche documentaire dans les PDFs ──
    try:
        all_chunks = []
        seen_files = set()

        # Récupération depuis la base de données
        documents = db.query(Document).all()
        for doc in documents:
            file_path = doc.chemin
            if not os.path.isabs(file_path):
                file_path = os.path.join(os.getcwd(), file_path)
            if os.path.exists(file_path):
                seen_files.add(os.path.abspath(file_path))
                all_chunks.extend(_get_document_chunks(file_path, doc.nom))

        # Vérification complémentaire du dossier uploads
        upload_dir = os.path.abspath(settings.DOCUMENTS_PATH)
        if os.path.exists(upload_dir):
            for fname in os.listdir(upload_dir):
                if fname.lower().endswith(".pdf"):
                    fpath = os.path.join(upload_dir, fname)
                    if os.path.abspath(fpath) not in seen_files:
                        all_chunks.extend(_get_document_chunks(fpath, fname))

        # Recherche des passages les plus pertinents (top_k=5 filtré)
        raw_top_chunks = _search_chunks(question, all_chunks, top_k=5)

        # Fusion des passages voisins (même page ou pages consécutives)
        retrieved_docs = _merge_adjacent_chunks(raw_top_chunks)

    except Exception as e:
        logger.error(f"Erreur lors de la recherche dans les PDFs : {e}")

    # ── Étape 2 : Prompt enrichi avec règles impératives ──
    system_prompt = """Tu es un assistant technique spécialisé dans l'analyse de procédures électriques.

Ta source de vérité est exclusivement le contenu des documents fournis dans le CONTEXTE.

RÈGLES OBLIGATOIRES :
1. Réponds uniquement avec les informations présentes dans les extraits des documents.
2. N'utilise jamais tes connaissances générales pour compléter une information absente.
3. N'invente aucune condition, valeur, étape, norme ou procédure.
4. Si une information nécessaire à la réponse n'est pas présente dans le contexte, indique-le clairement.
5. Donne une réponse suffisamment détaillée pour expliquer la question, et pas uniquement une réponse très courte.
6. Explique les informations importantes présentes dans le document qui permettent de comprendre la réponse.
7. Pour une procédure, respecte strictement l'ordre chronologique indiqué dans le document.
8. Distingue clairement :
   - conditions préalables ;
   - contrôles avant manœuvre ;
   - manœuvre ;
   - contrôles après manœuvre ;
   - conditions de sécurité ;
   - conditions SCADA/commande.
9. Ne mélange jamais les contrôles avant et après manœuvre.
10. Lorsque plusieurs informations du document sont nécessaires pour répondre, rassemble-les dans une réponse cohérente.
11. Conserve exactement les valeurs numériques, seuils, références et désignations techniques du document.
12. Si plusieurs valeurs différentes apparaissent dans les documents, ne choisis pas arbitrairement : signale les différences et indique leur contexte.
13. Cite les pages réellement utilisées pour construire la réponse.
14. Les sources affichées doivent correspondre aux passages réellement utilisés.
15. N'affirme jamais qu'une information vient du document si elle n'y apparaît pas.

STRUCTURE DE RÉPONSE OBLIGATOIRE :

Réponse :
[réponse directe et précise]

Explication :
[explication détaillée basée uniquement sur les documents]

Points importants :
- [élément pertinent 1]
- [élément pertinent 2]
- [élément pertinent 3]

Source :
[document + page(s) réellement utilisées]

Si les documents ne permettent pas de répondre :
« Je n'ai pas trouvé dans les documents fournis suffisamment d'informations pour répondre avec certitude à cette question. »
"""

    if retrieved_docs:
        context_parts = []
        total_chars = 0
        MAX_CONTEXT_CHARS = 3500  # Évite de saturer le modèle sur CPU pour une réponse rapide (< 20s)
        for i, doc in enumerate(retrieved_docs, 1):
            source = f"[Source: {doc['document_name']}, Page {doc['page']}]"
            part = f"--- Extrait {i} {source} ---\n{doc['text']}"
            if total_chars + len(part) > MAX_CONTEXT_CHARS and i > 1:
                break
            context_parts.append(part)
            total_chars += len(part)
        context = "\n\n".join(context_parts)

        prompt = f"""{system_prompt}

CONTEXTE (extraits des documents techniques) :
{context}

QUESTION DU TECHNICIEN :
{question}

RÉPONSE :"""
    else:
        prompt = f"""{system_prompt}

Aucun document technique pertinent n'a été trouvé dans la base.

QUESTION DU TECHNICIEN :
{question}

RÉPONSE :"""

    try:
        response_text = _call_ollama_http(prompt)
    except Exception as e:
        return {
            "reponse": f"Erreur lors de la communication avec l'IA : {str(e)}",
            "sources": [],
        }

    # ── Étape 3 : Filtrage intelligent des sources utiles ──
    # Ne retenir que les sources réellement contributives (score significatif)
    sources = []
    seen = set()
    max_score = max((doc.get("score", 0) for doc in retrieved_docs), default=1.0)

    for i, doc in enumerate(retrieved_docs):
        doc_score = doc.get("score", 0)
        # Retenir les sources majeures : au moins 35% du score maximal, plafonné à 4 sources maximum
        if (i == 0) or (max_score > 0 and doc_score >= max_score * 0.35 and len(sources) < 4):
            key = (doc["document_name"], str(doc["page"]))
            if key not in seen:
                seen.add(key)
                sources.append({
                    "titre": doc["document_name"],
                    "page": doc["page"],
                    "extrait": doc["text"][:180] + "..." if len(doc["text"]) > 180 else doc["text"],
                })

    return {
        "reponse": response_text,
        "sources": sources,
    }


# ─── API endpoint ─────────────────────────────────────────────────────

@router.post("", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a question and get a RAG-generated response."""
    # 1. Obtenir ou créer la conversation dès le départ pour avoir un ID persistant
    if request.conversation_id:
        conversation = db.query(Conversation).filter(
            Conversation.id == request.conversation_id,
            Conversation.user_id == current_user.id,
        ).first()
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation non trouvée",
            )
        from sqlalchemy import func
        msg_count = db.query(func.count(Message.id)).filter(Message.conversation_id == conversation.id).scalar()
        if msg_count == 0 or conversation.titre in ["Nouvelle question", "Nouvelle conversation", "Sans titre"]:
            conversation.titre = request.question[:100] + ("..." if len(request.question) > 100 else "")
            db.commit()
    else:
        # Créer immédiatement la nouvelle conversation
        titre = request.question[:100] + ("..." if len(request.question) > 100 else "")
        conversation = Conversation(
            user_id=current_user.id,
            titre=titre,
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # 2. Générer la réponse via le RAG
    result = _generate_rag_response(request.question, db)

    # 3. Enregistrer le message
    sources_data = result.get("sources", [])
    message = Message(
        conversation_id=conversation.id,
        question=request.question,
        reponse=result["reponse"],
        sources=json.dumps(sources_data, ensure_ascii=False) if sources_data else None,
    )
    db.add(message)
    db.commit()

    return ChatResponse(
        conversation_id=conversation.id,
        question=request.question,
        reponse=result["reponse"],
        sources=[SourceInfo(**s) for s in sources_data],
    )
