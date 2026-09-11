import React, { useState, useEffect } from 'react';
import { documentsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import type { Document } from '../../types';
import {
  Plus, Search, FileText, Download, Edit2, Trash2,
  Loader2, X, AlertTriangle, Check
} from 'lucide-react';

type ProgressStep = 'idle' | 'import' | 'extract' | 'index' | 'done';

export default function DocumentManagementPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  // Add Document form
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [addNom, setAddNom] = useState('');
  const [addCategorie, setAddCategorie] = useState('Général');
  const [addDescription, setAddDescription] = useState('');
  const [uploadStep, setUploadStep] = useState<ProgressStep>('idle');

  // Edit Document form
  const [editNom, setEditNom] = useState('');
  const [editCategorie, setEditCategorie] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  
  // Delete confirm
  const [isDeleting, setIsDeleting] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const data = await documentsApi.list();
      setDocuments(data);
    } catch (err: any) {
      showToast('error', 'Impossible de charger les documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPdfFile(file);
      // Autofill name if empty
      if (!addNom) {
        setAddNom(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile || !addNom) {
      showToast('error', 'Veuillez sélectionner un fichier et renseigner un nom');
      return;
    }

    try {
      // 1. Importation
      setUploadStep('import');
      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('nom', addNom);
      formData.append('categorie', addCategorie);
      if (addDescription) formData.append('description', addDescription);

      // Call API (backend performs PDF text extraction and ChromaDB embedding indexing)
      const result = await documentsApi.upload(formData);

      // Advance through steps quickly since backend returns immediately
      setUploadStep('extract');
      await new Promise(r => setTimeout(r, 400));
      setUploadStep('index');
      await new Promise(r => setTimeout(r, 400));
      setUploadStep('done');
      await new Promise(r => setTimeout(r, 600));

      // Reset and close
      setUploadStep('idle');
      setPdfFile(null);
      setAddNom('');
      setAddCategorie('Général');
      setAddDescription('');
      setIsAddOpen(false);
      showToast('success', 'Document importé ! L\'indexation se poursuit en arrière-plan.');
      loadDocuments();

    } catch (err: any) {
      setUploadStep('idle');
      let msg = 'Erreur lors de l\'import';
      if (err.response?.data?.detail) {
        msg = typeof err.response.data.detail === 'string'
          ? err.response.data.detail
          : JSON.stringify(err.response.data.detail);
      }
      showToast('error', msg);
    }
  };

  const openEditModal = (doc: Document) => {
    setSelectedDoc(doc);
    setEditNom(doc.nom);
    setEditCategorie(doc.categorie);
    setEditDescription(doc.description || '');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !editNom) return;

    setIsSavingEdit(true);
    try {
      await documentsApi.update(selectedDoc.id, {
        nom: editNom,
        categorie: editCategorie,
        description: editDescription,
      });
      showToast('success', 'Document mis à jour avec succès');
      setIsEditOpen(false);
      loadDocuments();
    } catch (err: any) {
      showToast('error', 'Erreur de mise à jour');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const openDeleteModal = (doc: Document) => {
    setSelectedDoc(doc);
    setIsDeleteOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!selectedDoc) return;
    setIsDeleting(true);
    try {
      await documentsApi.delete(selectedDoc.id);
      showToast('success', 'Document supprimé définitivement');
      setIsDeleteOpen(false);
      loadDocuments();
    } catch (err: any) {
      showToast('error', 'Erreur de suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.nom.toLowerCase().includes(search.toLowerCase()) ||
    doc.categorie.toLowerCase().includes(search.toLowerCase())
  );

  const formatSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    return kb < 1024 ? `${kb.toFixed(1)} Ko` : `${(kb / 1024).toFixed(1)} Mo`;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Gestion des documents</h2>
          <p className="text-sm text-text-secondary mt-1">Gérez la base documentaire RAG de l'application</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2 px-3.5 rounded-lg text-xs transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Ajouter un document
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 border border-border rounded-xl shadow-xs">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Rechercher par nom ou catégorie..."
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
            <span className="text-sm">Chargement des documents...</span>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center max-w-sm mx-auto">
            <FileText className="w-10 h-10 text-gray-300 mb-3" />
            <h4 className="font-semibold text-text-primary text-sm">Aucun document</h4>
            <p className="text-xs text-text-secondary mt-1">Ajoutez votre premier manuel technique PDF pour commencer.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-border text-xs font-semibold text-text-secondary uppercase">
                  <th className="px-6 py-4">Nom</th>
                  <th className="px-6 py-4">Catégorie</th>
                  <th className="px-6 py-4">Taille</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-text-primary">{doc.nom}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                        {doc.categorie}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-secondary text-xs">{formatSize(doc.taille)}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-full">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        {doc.statut}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = `/api/documents/${doc.id}/download`;
                          link.setAttribute('download', `${doc.nom}.pdf`);
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          showToast('success', `Téléchargement du document : ${doc.nom}`);
                        }}
                        className="inline-flex p-1.5 text-text-secondary hover:text-text-primary border border-border bg-white rounded-lg transition-colors"
                        title="Consulter"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openEditModal(doc)}
                        className="inline-flex p-1.5 text-text-secondary hover:text-primary-600 border border-border bg-white rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(doc)}
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

      {/* ADD MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl border border-border shadow-lg max-w-lg w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-text-primary text-sm">Ajouter un document</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 flex-1">
              {uploadStep === 'idle' ? (
                <>
                  {/* File Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Fichier PDF</label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="w-full text-xs text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    />
                  </div>

                  {/* Document Name */}
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Nom du document</label>
                    <input
                      type="text"
                      value={addNom}
                      onChange={(e) => setAddNom(e.target.value)}
                      placeholder="Ex: Notice Disjoncteur Legrand"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Catégorie</label>
                    <input
                      type="text"
                      value={addCategorie}
                      onChange={(e) => setAddCategorie(e.target.value)}
                      placeholder="Ex: Installation, Normes, Fabricant..."
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Description (facultative)</label>
                    <textarea
                      value={addDescription}
                      onChange={(e) => setAddDescription(e.target.value)}
                      placeholder="Ajouter une description..."
                      rows={2}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setIsAddOpen(false)}
                      className="px-4 py-2 border border-border rounded-lg text-xs font-semibold text-text-primary hover:bg-gray-50 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      Importer le document
                    </button>
                  </div>
                </>
              ) : (
                /* PROGRESS STEP VISUALIZATION */
                <div className="py-8 space-y-6 flex flex-col items-center">
                  <div className="text-center font-semibold text-sm text-text-primary">
                    Indexation en cours...
                  </div>
                  
                  {/* Step status list */}
                  <div className="w-full max-w-xs space-y-3">
                    {/* Importation */}
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className={uploadStep !== 'idle' ? 'text-text-primary' : 'text-text-secondary'}>Importation</span>
                      {uploadStep === 'import' ? <Loader2 className="w-4 h-4 animate-spin text-primary-500" /> : <Check className="w-4 h-4 text-success" />}
                    </div>

                    {/* Extraction */}
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className={['extract', 'index', 'done'].includes(uploadStep) ? 'text-text-primary' : 'text-text-secondary'}>Extraction</span>
                      {uploadStep === 'import' ? <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" /> : uploadStep === 'extract' ? <Loader2 className="w-4 h-4 animate-spin text-primary-500" /> : <Check className="w-4 h-4 text-success" />}
                    </div>

                    {/* Indexation */}
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className={['index', 'done'].includes(uploadStep) ? 'text-text-primary' : 'text-text-secondary'}>Indexation</span>
                      {['import', 'extract'].includes(uploadStep) ? <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" /> : uploadStep === 'index' ? <Loader2 className="w-4 h-4 animate-spin text-primary-500" /> : <Check className="w-4 h-4 text-success" />}
                    </div>

                    {/* Terminé */}
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className={uploadStep === 'done' ? 'text-text-primary' : 'text-text-secondary'}>Terminé</span>
                      {uploadStep !== 'done' ? <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" /> : <Check className="w-4 h-4 text-success" />}
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl border border-border shadow-lg max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-text-primary text-sm">Modifier le document</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Nom du document</label>
                <input
                  type="text"
                  value={editNom}
                  onChange={(e) => setEditNom(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Catégorie</label>
                <input
                  type="text"
                  value={editCategorie}
                  onChange={(e) => setEditCategorie(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Description (facultative)</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg text-xs font-semibold text-text-primary hover:bg-gray-50 transition-colors"
                  disabled={isSavingEdit}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                  disabled={isSavingEdit}
                >
                  {isSavingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE DIALOG */}
      {isDeleteOpen && selectedDoc && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl border border-border shadow-lg max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-danger mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="font-bold text-text-primary text-sm">Supprimer ce document ?</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Cette action supprimera le document <span className="font-semibold text-text-primary">"{selectedDoc.nom}"</span> de la base documentaire et son index vectoriel associé. Cette action est irréversible.
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
