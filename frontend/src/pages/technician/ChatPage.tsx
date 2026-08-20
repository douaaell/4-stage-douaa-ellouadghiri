import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Send, FileText, Bot, AlertTriangle, Loader2 } from 'lucide-react';
import { chatApi, conversationsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import type { Message, SourceInfo } from '../../types';

export default function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationIdParam = searchParams.get('c');

  const [conversationId, setConversationId] = useState<number | undefined>(
    conversationIdParam ? parseInt(conversationIdParam, 10) : undefined
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);

  const { showToast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load conversation details when active ID changes
  useEffect(() => {
    const cId = searchParams.get('c');
    if (cId) {
      const parsedId = parseInt(cId, 10);
      setConversationId(parsedId);
      loadConversation(parsedId);
    } else {
      setConversationId(undefined);
      setMessages([]);
    }
  }, [searchParams]);

  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const loadConversation = async (id: number) => {
    setIsPageLoading(true);
    try {
      const data = await conversationsApi.get(id);
      setMessages(data.messages);
    } catch (err: any) {
      showToast('error', 'Impossible de charger la conversation');
    } finally {
      setIsPageLoading(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userQuestion = input.trim();
    setInput('');
    setIsLoading(true);

    // Optimistically add user question
    const tempUserMsg: Message = {
      id: Date.now(),
      conversation_id: conversationId || 0,
      question: userQuestion,
      reponse: '',
      sources: null,
      date: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const result = await chatApi.send({
        question: userQuestion,
        conversation_id: conversationId,
      });

      // Update active conversation ID and URL parameter if new conversation
      if (!conversationId) {
        setConversationId(result.conversation_id);
        setSearchParams({ c: result.conversation_id.toString() });
      }

      // Replace optimistic message with actual result
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempUserMsg.id
            ? {
                id: Date.now() + 1,
                conversation_id: result.conversation_id,
                question: result.question,
                reponse: result.reponse,
                sources: result.sources,
                date: new Date().toISOString(),
              }
            : msg
        )
      );
    } catch (err: any) {
      showToast('error', 'Erreur lors de la génération de la réponse');
      // Remove optimistic message if error
      setMessages(prev => prev.filter(msg => msg.id !== tempUserMsg.id));
    } finally {
      setIsLoading(false);
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
      
      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
        {isPageLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm">Chargement de la conversation...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center text-primary mb-4">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-text-primary text-base">CSELEC assistant</h3>
            <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">
              Posez une question technique en langage naturel. L'assistant recherchera des réponses précises dans la base documentaire.
            </p>
            <div className="mt-6 w-full grid grid-cols-1 gap-2.5">
              <button
                onClick={() => setInput("Comment installer un disjoncteur différentiel 30 mA ?")}
                className="text-left text-xs bg-background hover:bg-gray-50 border border-border p-3 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
              >
                💡 Comment installer un disjoncteur différentiel 30 mA ?
              </button>
              <button
                onClick={() => setInput("Quelle section de câble utiliser pour un four ?")}
                className="text-left text-xs bg-background hover:bg-gray-50 border border-border p-3 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
              >
                💡 Quelle section de câble utiliser pour un four ?
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={msg.id || i} className="space-y-4">
              {/* User Question */}
              <div className="flex justify-end">
                <div className="max-w-[85%] bg-primary-50 text-primary-900 border border-primary-100 rounded-2xl px-4 py-3 text-sm shadow-sm">
                  {msg.question}
                </div>
              </div>

              {/* Bot Response */}
              {msg.reponse && (
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center flex-shrink-0 text-sm shadow-sm">
                    <Bot className="w-4.5 h-4.5" />
                  </div>
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="bg-background border border-border rounded-2xl px-4 py-3 shadow-sm text-sm chat-markdown">
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
              <div className="bg-background border border-border rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="flex gap-1">
                  <span className="w-2.5 h-2.5 bg-primary-400 rounded-full loading-dot" />
                  <span className="w-2.5 h-2.5 bg-primary-400 rounded-full loading-dot" />
                  <span className="w-2.5 h-2.5 bg-primary-400 rounded-full loading-dot" />
                </div>
                <span className="text-xs font-medium text-text-secondary">Recherche dans les documents...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSend} className="p-4 border-t border-border bg-white flex items-end gap-3">
        <textarea
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
        >
          <Send className="w-4.5 h-4.5" />
        </button>
      </form>
    </div>
  );
}
