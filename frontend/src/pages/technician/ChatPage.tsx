import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Send, FileText, Bot, Loader2, PlusCircle, MessageSquare } from 'lucide-react';
import { chatApi, conversationsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import type { Message, ConversationDetail } from '../../types';

export default function ChatPage() {
  const { id: routeId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Determine active conversation ID from URL param (/chat/:id) or query param (/chat?c=id)
  const urlConvId = routeId
    ? parseInt(routeId, 10)
    : searchParams.get('c')
    ? parseInt(searchParams.get('c')!, 10)
    : undefined;

  const [conversationId, setConversationId] = useState<number | undefined>(urlConvId);
  const [conversationTitle, setConversationTitle] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);

  const { showToast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Track which conversation ID is currently loaded in state to prevent redundant re-fetching
  const loadedConvIdRef = useRef<number | undefined>(undefined);

  // Sync state when URL changes (e.g. clicking history item or sidebar "Nouvelle question")
  useEffect(() => {
    if (urlConvId && !isNaN(urlConvId)) {
      if (loadedConvIdRef.current !== urlConvId) {
        loadConversation(urlConvId);
      }
    } else {
      // User requested a new conversation (e.g. navigated to /chat)
      if (loadedConvIdRef.current !== undefined) {
        setConversationId(undefined);
        setConversationTitle('');
        setMessages([]);
        loadedConvIdRef.current = undefined;
      }
    }
  }, [urlConvId]);

  // Scroll smoothly to bottom when messages or loading changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const loadConversation = async (id: number) => {
    setIsPageLoading(true);
    try {
      const data = await conversationsApi.get(id);
      setMessages(data.messages || []);
      setConversationId(data.id);
      setConversationTitle(data.titre || '');
      loadedConvIdRef.current = data.id;
    } catch (err: any) {
      showToast('error', 'Impossible de charger la conversation');
      // Reset to clean chat if conversation not found
      setConversationId(undefined);
      setConversationTitle('');
      setMessages([]);
      loadedConvIdRef.current = undefined;
    } finally {
      setIsPageLoading(false);
    }
  };

  const handleStartNewChat = () => {
    setConversationId(undefined);
    setConversationTitle('');
    setMessages([]);
    loadedConvIdRef.current = undefined;
    setInput('');
    navigate('/chat');
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userQuestion = input.trim();
    setInput('');
    setIsLoading(true);

    // Optimistically add user question to the ongoing list of messages
    const tempMsgId = Date.now();
    const tempUserMsg: Message = {
      id: tempMsgId,
      conversation_id: conversationId || 0,
      question: userQuestion,
      reponse: '',
      sources: null,
      date: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      // Send question with current conversationId (or undefined for first question)
      const result = await chatApi.send({
        question: userQuestion,
        conversation_id: conversationId,
      });

      const activeId = result.conversation_id;

      // Ensure conversationId is preserved for all subsequent questions
      setConversationId(activeId);
      loadedConvIdRef.current = activeId;

      // Update browser URL without reloading page or wiping state
      window.history.replaceState(null, '', `/chat/${activeId}`);

      // Replace the optimistic message with the final response from AI
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempMsgId
            ? {
                id: Date.now() + 1,
                conversation_id: activeId,
                question: result.question,
                reponse: result.reponse,
                sources: result.sources,
                date: new Date().toISOString(),
              }
            : msg
        )
      );
    } catch (err: any) {
      // Si une coupure réseau ou proxy s'est produite (ex: ERR_EMPTY_RESPONSE),
      // le backend a très probablement terminé et persisté la réponse dans SQLite.
      // Tentative de récupération automatique :
      let recovered = false;
      const targetId = conversationId || loadedConvIdRef.current;

      for (let attempt = 1; attempt <= 4; attempt++) {
        await new Promise(res => setTimeout(res, 2000));
        try {
          let convDetail: ConversationDetail | null = null;
          if (targetId) {
            convDetail = await conversationsApi.get(targetId);
          } else {
            const list = await conversationsApi.list();
            if (list && list.length > 0) {
              convDetail = await conversationsApi.get(list[0].id);
            }
          }

          if (convDetail && convDetail.messages && convDetail.messages.length > 0) {
            const lastMsg = convDetail.messages[convDetail.messages.length - 1];
            if (lastMsg.question.trim() === userQuestion.trim() && lastMsg.reponse) {
              setConversationId(convDetail.id);
              loadedConvIdRef.current = convDetail.id;
              window.history.replaceState(null, '', `/chat/${convDetail.id}`);
              setMessages(convDetail.messages);
              recovered = true;
              break;
            }
          }
        } catch {
          // Ignorer l'erreur durant la tentative de récupération
        }
      }

      if (!recovered) {
        showToast('error', "Le serveur met du temps à répondre. La réponse sera visible dans l'Historique.");
        // Préserver impérativement la question affichée à l'écran avec un message de statut
        setMessages(prev =>
          prev.map(msg =>
            msg.id === tempMsgId
              ? {
                  ...msg,
                  reponse: "Le traitement de votre question a pris plus de temps que prévu ou la connexion réseau s'est interrompue. Votre réponse est en cours de finalisation et apparaîtra dans votre Historique.",
                }
              : msg
          )
        );
      }
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-5xl mx-auto bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      
      {/* Top Conversation Header */}
      <div className="px-5 py-3.5 border-b border-border bg-gray-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-text-primary truncate">
              {conversationTitle || (conversationId ? `Conversation #${conversationId}` : 'Nouvelle conversation')}
            </h2>
            <p className="text-xs text-text-secondary">
              {conversationId
                ? `${messages.length} message${messages.length > 1 ? 's' : ''} échangé${messages.length > 1 ? 's' : ''}`
                : 'Posez votre première question'}
            </p>
          </div>
        </div>

        {/* Explicit button to start a fresh new conversation */}
        <button
          onClick={handleStartNewChat}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-700 bg-white hover:bg-primary-50 border border-border hover:border-primary-200 rounded-lg shadow-2xs transition-colors"
          title="Démarrer une nouvelle discussion vierge"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Nouvelle question</span>
        </button>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
        {isPageLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm">Chargement de la conversation...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center text-primary mb-4 shadow-xs">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-text-primary text-base">CSELEC assistant</h3>
            <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">
              Posez une question technique en langage naturel. L'assistant recherchera des réponses précises dans la base documentaire.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={msg.id || i} className="space-y-4">
              {/* User Question */}
              <div className="flex justify-end">
                <div className="max-w-[85%] bg-primary-50 text-primary-900 border border-primary-100 rounded-2xl px-4 py-3 text-sm shadow-2xs font-normal">
                  {msg.question}
                </div>
              </div>

              {/* Bot Response */}
              {msg.reponse && (
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center flex-shrink-0 text-sm shadow-2xs">
                    <Bot className="w-4.5 h-4.5" />
                  </div>
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="bg-background border border-border rounded-2xl px-4 py-3 shadow-2xs text-sm chat-markdown">
                      <ReactMarkdown>{msg.reponse}</ReactMarkdown>
                    </div>

                    {/* Sources citation */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="bg-gray-50 border border-border rounded-xl p-3">
                        <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" />
                          Sources utilisées :
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {msg.sources.map((src, idx) => (
                            <div
                              key={idx}
                              className="text-xs bg-white border border-border px-2.5 py-1.5 rounded-lg text-text-primary shadow-2xs hover:bg-gray-50 transition-colors"
                              title={src.extrait || ''}
                            >
                              <span className="font-medium">{src.titre}</span>
                              {src.page && (
                                <span className="text-text-secondary ml-1">— Page {src.page}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading status (while waiting for response) */}
        {isLoading && (
          <div className="flex gap-3 max-w-[85%] animate-pulse">
            <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center flex-shrink-0 text-sm">
              <Bot className="w-4.5 h-4.5 animate-spin" />
            </div>
            <div className="space-y-2 flex-1">
              <div className="bg-background border border-border rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xs">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary-400 rounded-full loading-dot" />
                  <span className="w-2 h-2 bg-primary-400 rounded-full loading-dot" />
                  <span className="w-2 h-2 bg-primary-400 rounded-full loading-dot" />
                </div>
                <span className="text-xs font-medium text-text-secondary">Recherche dans les documents et rédaction...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSend} className="p-4 border-t border-border bg-white flex items-end gap-3">
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Posez votre question ici..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 max-h-32 px-3.5 py-2.5 border border-border rounded-xl bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm resize-none transition-all"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:bg-gray-100 text-white disabled:text-gray-400 flex items-center justify-center shadow-sm transition-colors"
          title="Envoyer la question"
        >
          <Send className="w-4.5 h-4.5" />
        </button>
      </form>
    </div>
  );
}
