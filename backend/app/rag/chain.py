"""
RAG chain — orchestrates retrieval and generation.
"""
from typing import Dict, List
from app.core.config import settings
from app.rag.embeddings import embeddings_manager


def build_context(retrieved_docs: List[Dict]) -> str:
    """Build context string from retrieved documents."""
    if not retrieved_docs:
        return ""
    
    context_parts = []
    for i, doc in enumerate(retrieved_docs, 1):
        source = f"[Source: {doc['document_name']}, Page {doc['page']}]"
        context_parts.append(f"--- Extrait {i} {source} ---\n{doc['text']}")
    
    return "\n\n".join(context_parts)


def build_prompt(question: str, context: str) -> str:
    """Build the prompt for the LLM."""
    system_prompt = """Tu es un assistant technique spécialisé en électricité. 
Tu aides les techniciens en répondant à leurs questions techniques.

RÈGLES IMPORTANTES :
1. Réponds UNIQUEMENT à partir des extraits de documents fournis ci-dessous.
2. Si les documents ne contiennent pas l'information, dis clairement : "Je n'ai pas trouvé d'information suffisamment pertinente dans les documents disponibles pour répondre à cette question."
3. Ne JAMAIS inventer ou supposer des informations.
4. Structure ta réponse avec des titres, listes et paragraphes pour une bonne lisibilité.
5. Cite toujours les sources utilisées.
6. Réponds en français.
"""
    
    if context:
        return f"""{system_prompt}

CONTEXTE (extraits des documents techniques) :
{context}

QUESTION DU TECHNICIEN :
{question}

RÉPONSE :"""
    else:
        return f"""{system_prompt}

Aucun document pertinent n'a été trouvé.

QUESTION DU TECHNICIEN :
{question}

RÉPONSE :"""


def generate_response(question: str) -> Dict:
    """
    Full RAG pipeline: retrieve → build context → generate response.
    
    Returns:
        Dict with 'reponse' and 'sources' keys.
    """
    # Step 1: Retrieve relevant documents
    retrieved_docs = embeddings_manager.search(question)
    
    # Step 2: Build context
    context = build_context(retrieved_docs)
    
    # Step 3: Build prompt
    prompt = build_prompt(question, context)
    
    # Step 4: Generate response with LLM
    try:
        if settings.LLM_PROVIDER == "ollama":
            response_text = _call_ollama(prompt)
        elif settings.LLM_PROVIDER == "openai":
            response_text = _call_openai(prompt)
        else:
            response_text = "Configuration LLM non reconnue. Veuillez vérifier les paramètres."
    except Exception as e:
        response_text = f"Erreur lors de la génération de la réponse : {str(e)}"
    
    # Step 5: Build sources
    sources = []
    seen = set()
    for doc in retrieved_docs:
        key = (doc["document_name"], doc["page"])
        if key not in seen:
            seen.add(key)
            sources.append({
                "titre": doc["document_name"],
                "page": doc["page"],
                "extrait": doc["text"][:150] + "..." if len(doc["text"]) > 150 else doc["text"],
            })
    
    return {
        "reponse": response_text,
        "sources": sources,
    }


def _call_ollama(prompt: str) -> str:
    """Call Ollama local LLM."""
    try:
        from langchain_ollama import OllamaLLM
        
        llm = OllamaLLM(
            model=settings.OLLAMA_MODEL,
            base_url=settings.OLLAMA_BASE_URL,
        )
        return llm.invoke(prompt)
    except Exception as e:
        raise Exception(f"Erreur Ollama : {str(e)}. Vérifiez qu'Ollama est en cours d'exécution.")


def _call_openai(prompt: str) -> str:
    """Call OpenAI API."""
    try:
        from langchain_openai import ChatOpenAI
        
        llm = ChatOpenAI(
            model=settings.OPENAI_MODEL,
            api_key=settings.OPENAI_API_KEY,
        )
        response = llm.invoke(prompt)
        return response.content
    except Exception as e:
        raise Exception(f"Erreur OpenAI : {str(e)}")
