import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { conversationsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import type { Conversation } from '../../types';
import { Search, Calendar, ChevronRight, MessageSquare, Loader2, ArrowRight } from 'lucide-react';

export default function HistoryPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const data = await conversationsApi.list();
      setConversations(data);
    } catch (err: any) {
      showToast('error', 'Impossible de charger l\'historique');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.titre.toLowerCase().includes(search.toLowerCase());
    
    let matchesDate = true;
    if (dateFilter) {
      const convDate = new Date(conv.date_creation).toISOString().split('T')[0];
      matchesDate = convDate === dateFilter;
    }
    
    return matchesSearch && matchesDate;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredConversations.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredConversations.slice(indexOfFirstItem, indexOfLastItem);

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
        <h2 className="text-xl font-bold text-text-primary">Historique de vos conversations</h2>
        <p className="text-sm text-text-secondary mt-1">Consultez et reprenez vos anciennes discussions avec l'assistant</p>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 border border-border rounded-xl shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Rechercher une question..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm transition-all"
          />
        </div>

        {/* Date filter */}
        <div className="relative w-full sm:w-48">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm transition-all"
          />
        </div>
        
        {/* Reset filters */}
        {(search || dateFilter) && (
          <button
            onClick={() => {
              setSearch('');
              setDateFilter('');
              setCurrentPage(1);
            }}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium self-center px-2 py-1"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Table / List */}
      <div className="bg-white border border-border rounded-xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-text-secondary gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm">Chargement de l'historique...</span>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center max-w-sm mx-auto">
            <MessageSquare className="w-10 h-10 text-gray-300 mb-3" />
            <h4 className="font-semibold text-text-primary text-sm">Aucune conversation trouvée</h4>
            <p className="text-xs text-text-secondary mt-1">
              {search || dateFilter 
                ? 'Essayez de modifier vos filtres de recherche.' 
                : 'Vous n\'avez encore aucune conversation avec l\'assistant.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-border text-xs font-semibold text-text-secondary uppercase">
                  <th className="px-6 py-4">Question / Titre</th>
                  <th className="px-6 py-4 w-48">Date</th>
                  <th className="px-6 py-4 w-28 text-center">Messages</th>
                  <th className="px-6 py-4 w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {currentItems.map((conv) => (
                  <tr key={conv.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-text-primary">
                      <div className="line-clamp-1">{conv.titre}</div>
                    </td>
                    <td className="px-6 py-4 text-text-secondary text-xs">
                      {formatDate(conv.date_creation)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                        {conv.message_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/chat?c=${conv.id}`)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-700 transition-colors"
                      >
                        Ouvrir
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between">
            <div className="text-xs text-text-secondary">
              Affichage de {indexOfFirstItem + 1} à {Math.min(indexOfLastItem, filteredConversations.length)} sur {filteredConversations.length} conversations
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-text-primary hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                Précédent
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-text-primary hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
