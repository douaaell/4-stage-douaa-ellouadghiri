import React, { useState, useEffect } from 'react';
import { documentsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import type { Document } from '../../types';
import { Search, Filter, FileText, Download, Loader2 } from 'lucide-react';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [docsData, catsData] = await Promise.all([
        documentsApi.list(),
        documentsApi.categories()
      ]);
      setDocuments(docsData);
      setCategories(catsData);
    } catch (err: any) {
      showToast('error', 'Impossible de charger la base documentaire');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter logic
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.nom.toLowerCase().includes(search.toLowerCase()) || 
                          (doc.description && doc.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategory === '' || doc.categorie === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} Ko`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} Mo`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleDownload = (doc: Document) => {
    const link = document.createElement('a');
    link.href = `/api/documents/${doc.id}/download`;
    link.setAttribute('download', `${doc.nom}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', `Téléchargement du document : ${doc.nom}`);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Base Documentaire</h2>
        <p className="text-sm text-text-secondary mt-1">Consultez les notices techniques et guides d'installation de l'entreprise</p>
      </div>

      {/* Filter and search bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 border border-border rounded-xl shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Rechercher un document..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm transition-all"
          />
        </div>

        {/* Category dropdown */}
        <div className="relative w-full sm:w-48">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full pl-9 pr-8 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm transition-all appearance-none"
          >
            <option value="">Toutes les catégories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents Grid / Table */}
      <div className="bg-white border border-border rounded-xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-text-secondary gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm">Chargement des documents...</span>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center max-w-sm mx-auto">
            <FileText className="w-10 h-10 text-gray-300 mb-3" />
            <h4 className="font-semibold text-text-primary text-sm">Aucun document disponible</h4>
            <p className="text-xs text-text-secondary mt-1">
              {search || selectedCategory 
                ? 'Modifiez votre recherche ou catégorie.' 
                : 'Aucun document n\'a été ajouté par l\'administrateur.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-border text-xs font-semibold text-text-secondary uppercase">
                  <th className="px-6 py-4">Nom du document</th>
                  <th className="px-6 py-4">Catégorie</th>
                  <th className="px-6 py-4 w-32">Taille</th>
                  <th className="px-6 py-4 w-36">Importé le</th>
                  <th className="px-6 py-4 w-28 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary-50 text-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-medium text-text-primary">{doc.nom}</div>
                          {doc.description && (
                            <div className="text-xs text-text-secondary mt-0.5 line-clamp-1">{doc.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2.5 py-1 text-xs font-medium bg-primary-50 text-primary-700 rounded-lg">
                        {doc.categorie}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-secondary text-xs">
                      {formatSize(doc.taille)}
                    </td>
                    <td className="px-6 py-4 text-text-secondary text-xs">
                      {formatDate(doc.date_import)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border hover:bg-gray-50 rounded-lg text-xs font-medium text-text-primary shadow-2xs transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Consulter
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
