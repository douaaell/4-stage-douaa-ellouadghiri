import React, { useState, useEffect } from 'react';
import { conversationsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import type { Conversation, ConversationDetail } from '../../types';
import { Search, Calendar, ChevronRight, MessageSquare, Loader2, ArrowRight, X, Bot, FileText, Trash2, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function ConversationHistoryPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Active detail modal
  const [activeConv, setActiveConv] = useState<ConversationDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Delete modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const data = await conversationsApi.list();
      setConversations(data);
    } catch (err: any) {
      showToast('error', 'Impossible de charger l\'historique global');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDetail = async (id: number) => {
    setIsDetailLoading(true);
    try {
      const data = await conversationsApi.get(id);
      setActiveConv(data);
    } catch (err: any) {
      showToast('error', 'Impossible de charger le détail de la conversation');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const openDeleteModal = (e: React.MouseEvent, conv: Conversation) => {
    e.stopPropagation();
    setSelectedConv(conv);
    setIsDeleteOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!selectedConv) return;
    setIsDeleting(true);
    try {
      await conversationsApi.delete(selectedConv.id);
      showToast('success', 'Conversation supprimée avec succès');
      setIsDeleteOpen(false);
      loadConversations();
    } catch (err: any) {
      showToast('error', 'Impossible de supprimer la conversation');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.titre.toLowerCase().includes(search.toLowerCase()) ||
    (conv.user_nom && conv.user_nom.toLowerCase().includes(search.toLowerCase()))
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Historique des conversations</h2>
        <p className="text-sm text-text-secondary mt-1">Consultez l'activité et le contenu des discussions des techniciens</p>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 border border-border rounded-xl shadow-xs">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Rechercher par technicien ou question..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-text-secondary gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm">Chargement de l'historique...</span>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center max-w-sm mx-auto">
            <MessageSquare className="w-10 h-10 text-gray-300 mb-3" />
            <h4 className="font-semibold text-text-primary text-sm">Aucune conversation</h4>
            <p className="text-xs text-text-secondary mt-1">Les techniciens n'ont pas encore commencé de discussion.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-border text-xs font-semibold text-text-secondary uppercase">
                  <th className="px-6 py-4">Technicien</th>
                  <th className="px-6 py-4">Titre / Question</th>
                  <th className="px-6 py-4 w-48">Date</th>
                  <th className="px-6 py-4 w-28 text-center">Messages</th>
                  <th className="px-6 py-4 w-36 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filteredConversations.map((conv) => (
                  <tr key={conv.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-text-primary">
                      {conv.user_nom || 'Utilisateur inconnu'}
                    </td>
                    <td className="px-6 py-4 text-text-primary">
                      <div className="line-clamp-1">{conv.titre}</div>
                    </td>
                    <td className="px-6 py-4 text-text-secondary text-xs">{formatDate(conv.date_creation)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded-full">
                        {conv.message_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenDetail(conv.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border hover:bg-gray-50 rounded-lg text-xs font-semibold text-primary transition-colors"
                      >
                        Consulter
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => openDeleteModal(e, conv)}
                        className="inline-flex p-1.5 text-danger hover:bg-rose-50 border border-border rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL DIALOG */}
      {activeConv && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl border border-border shadow-lg max-w-2xl w-full h-[80vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="font-bold text-text-primary text-sm">Conversation de {activeConv.user_nom}</h3>
                <p className="text-[10px] text-text-secondary mt-0.5">Démarrée le {formatDate(activeConv.date_creation)}</p>
              </div>
              <button onClick={() => setActiveConv(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-background">
              {activeConv.messages.map((msg, idx) => (
                <div key={msg.id || idx} className="space-y-4">
                  {/* User Question */}
                  <div className="flex justify-end">
                    <div className="max-w-[85%] bg-primary-50 text-primary-900 border border-primary-100 rounded-2xl px-4 py-3 text-xs shadow-sm">
                      {msg.question}
                    </div>
                  </div>

                  {/* Bot Response */}
                  <div className="flex gap-3 max-w-[85%]">
                    <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center flex-shrink-0 text-xs">
                      <Bot className="w-4.5 h-4.5" />
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className="bg-white border border-border rounded-2xl px-4 py-3 shadow-sm text-xs chat-markdown">
                        <ReactMarkdown>{msg.reponse}</ReactMarkdown>
                      </div>

                      {/* Sources */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="bg-gray-50 border border-border rounded-xl p-2.5">
                          <div className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Sources :
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.sources.map((src, sIdx) => (
                              <div
                                key={sIdx}
                                className="text-[10px] bg-white border border-border px-2 py-1 rounded text-text-primary"
                              >
                                <span className="font-medium">{src.titre}</span>
                                {src.page && <span className="text-text-secondary ml-0.5">— p.{src.page}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DELETE DIALOG */}
      {isDeleteOpen && selectedConv && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl border border-border shadow-lg max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-danger mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="font-bold text-text-primary text-sm">Supprimer cette conversation ?</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Voulez-vous vraiment supprimer définitivement la conversation de <span className="font-semibold text-text-primary">"{selectedConv.user_nom}"</span> intitulée <span className="font-semibold text-text-primary">"{selectedConv.titre}"</span> ? Cette action est irréversible.
              </p>
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="px-4 py-2 border border-border rounded-lg text-xs font-semibold text-text-primary hover:bg-gray-50 transition-colors"
                disabled={isDeleting}
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteSubmit}
                className="px-4 py-2 bg-danger hover:bg-rose-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                disabled={isDeleting}
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
