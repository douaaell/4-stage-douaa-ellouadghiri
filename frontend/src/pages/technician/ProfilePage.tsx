import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { usersApi } from '../../services/api';
import { User, Mail, Shield, Calendar, Edit2, Loader2, Save, X } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [nom, setNom] = useState(user?.nom || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom || !email) {
      showToast('error', 'Veuillez remplir le nom et l\'email');
      return;
    }

    if (password && password !== confirmPassword) {
      showToast('error', 'Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);
    try {
      const payload: any = { nom, email };
      if (password) payload.mot_de_passe = password;

      const updated = await usersApi.updateProfile(payload);
      updateUser(updated);
      showToast('success', 'Profil mis à jour avec succès');
      setIsEditing(false);
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Erreur lors de la mise à jour';
      showToast('error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Mon Profil</h2>
        <p className="text-sm text-text-secondary mt-1">Consultez et modifiez les informations de votre compte professionnel</p>
      </div>

      <div className="bg-white border border-border rounded-xl shadow-xs overflow-hidden">
        {/* Profile Card Header */}
        <div className="bg-primary-900 px-6 py-8 flex flex-col sm:flex-row items-center gap-4 text-white">
          <div className="w-16 h-16 rounded-full bg-primary-500 text-white border-2 border-white/20 flex items-center justify-center text-xl font-bold">
            {user.nom.charAt(0).toUpperCase()}
          </div>
          <div className="text-center sm:text-left">
            <h3 className="text-lg font-semibold">{user.nom}</h3>
            <p className="text-xs text-blue-300 capitalize mt-0.5">{user.role}</p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="sm:ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Modifier mon profil
            </button>
          )}
        </div>

        {/* Profile Form / Read-Only View */}
        <div className="p-6">
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Nom complet</label>
                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Adresse email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Nouveau mot de passe</label>
                  <input
                    type="password"
                    placeholder="Laisser vide pour ne pas modifier"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Confirmer le mot de passe</label>
                  <input
                    type="password"
                    placeholder="Laisser vide pour ne pas modifier"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setNom(user.nom);
                    setEmail(user.email);
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 border border-border text-xs font-semibold text-text-primary hover:bg-gray-50 rounded-lg transition-colors"
                  disabled={isLoading}
                >
                  <X className="w-3.5 h-3.5" />
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-lg transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Enregistrer
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Email Info */}
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 border border-border flex items-center justify-center text-text-secondary flex-shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Email professionnel</div>
                    <div className="text-sm font-medium text-text-primary mt-1">{user.email}</div>
                  </div>
                </div>

                {/* Role Info */}
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 border border-border flex items-center justify-center text-text-secondary flex-shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Rôle système</div>
                    <div className="text-sm font-medium text-text-primary mt-1 capitalize">{user.role}</div>
                  </div>
                </div>

                {/* Date Created Info */}
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 border border-border flex items-center justify-center text-text-secondary flex-shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Compte créé le</div>
                    <div className="text-sm font-medium text-text-primary mt-1">{formatDate(user.date_creation)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
