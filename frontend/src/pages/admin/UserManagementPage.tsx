import React, { useState, useEffect } from 'react';
import { usersApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import type { User } from '../../types';
import {
  Plus, Search, Shield, User as UserIcon, Edit2, Trash2,
  Loader2, X, AlertTriangle, Check, Eye
} from 'lucide-react';

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Add form fields
  const [addNom, setAddNom] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addConfirmPassword, setAddConfirmPassword] = useState('');
  const [addRole, setAddRole] = useState('technicien');
  const [addStatut, setAddStatut] = useState('actif');
  const [isCreating, setIsCreating] = useState(false);

  // Edit form fields
  const [editNom, setEditNom] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('technicien');
  const [editStatut, setEditStatut] = useState('actif');
  const [editPassword, setEditPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete state
  const [isDeleting, setIsDeleting] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await usersApi.list();
      setUsers(data);
    } catch (err: any) {
      showToast('error', 'Impossible de charger la liste des utilisateurs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addNom || !addEmail || !addPassword) {
      showToast('error', 'Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (addPassword !== addConfirmPassword) {
      showToast('error', 'Les mots de passe ne correspondent pas');
      return;
    }

    setIsCreating(true);
    try {
      await usersApi.create({
        nom: addNom,
        email: addEmail,
        mot_de_passe: addPassword,
        role: addRole,
        statut: addStatut,
      });
      showToast('success', 'Utilisateur créé avec succès');
      setIsAddOpen(false);
      // Reset fields
      setAddNom('');
      setAddEmail('');
      setAddPassword('');
      setAddConfirmPassword('');
      setAddRole('technicien');
      setAddStatut('actif');
      loadUsers();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Erreur lors de la création';
      showToast('error', msg);
    } finally {
      setIsCreating(false);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditNom(user.nom);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditStatut(user.statut);
    setEditPassword('');
    setEditConfirmPassword('');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !editNom || !editEmail) return;

    if (editPassword && editPassword !== editConfirmPassword) {
      showToast('error', 'Les mots de passe ne correspondent pas');
      return;
    }

    setIsSavingEdit(true);
    try {
      const payload: any = {
        nom: editNom,
        email: editEmail,
        role: editRole,
        statut: editStatut,
      };
      if (editPassword) {
        payload.mot_de_passe = editPassword;
      }
      await usersApi.update(selectedUser.id, payload);
      showToast('success', 'Utilisateur mis à jour');
      setIsEditOpen(false);
      loadUsers();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Erreur lors de la mise à jour';
      showToast('error', msg);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!selectedUser) return;
    setIsDeleting(true);
    try {
      await usersApi.delete(selectedUser.id);
      showToast('success', 'Utilisateur supprimé');
      setIsDeleteOpen(false);
      loadUsers();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Erreur de suppression';
      showToast('error', msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.nom.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Gestion des utilisateurs</h2>
          <p className="text-sm text-text-secondary mt-1">Créez et configurez les comptes techniciens et administrateurs</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2 px-3.5 rounded-lg text-xs transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Ajouter un utilisateur
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 border border-border rounded-xl shadow-xs">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
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
            <span className="text-sm">Chargement des utilisateurs...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center max-w-sm mx-auto">
            <UserIcon className="w-10 h-10 text-gray-300 mb-3" />
            <h4 className="font-semibold text-text-primary text-sm">Aucun utilisateur</h4>
            <p className="text-xs text-text-secondary mt-1">Utilisez le bouton en haut à droite pour en ajouter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-border text-xs font-semibold text-text-secondary uppercase">
                  <th className="px-6 py-4">Nom</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Rôle</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-text-primary">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-xs">
                          {user.nom.charAt(0).toUpperCase()}
                        </div>
                        {user.nom}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-secondary text-xs">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${
                        user.role === 'administrateur' 
                          ? 'bg-violet-50 text-violet-700' 
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {user.role === 'administrateur' ? 'Administrateur' : 'Technicien'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${
                        user.statut === 'actif'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-50 text-gray-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          user.statut === 'actif' ? 'bg-emerald-500' : 'bg-gray-400'
                        }`} />
                        {user.statut}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="inline-flex p-1.5 text-text-secondary hover:text-primary-600 border border-border bg-white rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(user)}
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

      {/* ADD USER MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl border border-border shadow-lg max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-text-primary text-sm">Ajouter un utilisateur</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Nom complet</label>
                <input
                  type="text"
                  required
                  placeholder="Nom Prénom"
                  value={addNom}
                  onChange={(e) => setAddNom(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Mot de passe</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Confirmer le mot de passe</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={addConfirmPassword}
                  onChange={(e) => setAddConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Rôle</label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    <option value="technicien">Technicien</option>
                    <option value="administrateur">Administrateur</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Statut</label>
                  <select
                    value={addStatut}
                    onChange={(e) => setAddStatut(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg text-xs font-semibold text-text-primary hover:bg-gray-50 transition-colors"
                  disabled={isCreating}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                  disabled={isCreating}
                >
                  {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Créer l'utilisateur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl border border-border shadow-lg max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-text-primary text-sm">Modifier l'utilisateur</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Nom complet</label>
                <input
                  type="text"
                  required
                  value={editNom}
                  onChange={(e) => setEditNom(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Rôle</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    <option value="technicien">Technicien</option>
                    <option value="administrateur">Administrateur</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Statut</label>
                  <select
                    value={editStatut}
                    onChange={(e) => setEditStatut(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Nouveau mot de passe</label>
                  <input
                    type="password"
                    placeholder="Laisser vide pour inchangé"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Confirmer le mot de passe</label>
                  <input
                    type="password"
                    placeholder="Laisser vide pour inchangé"
                    value={editConfirmPassword}
                    onChange={(e) => setEditConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
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
      {isDeleteOpen && selectedUser && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl border border-border shadow-lg max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-danger mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="font-bold text-text-primary text-sm">Supprimer l'utilisateur ?</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Voulez-vous vraiment supprimer définitivement l'utilisateur <span className="font-semibold text-text-primary">"{selectedUser.nom}"</span> ? Cette action est irréversible.
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
