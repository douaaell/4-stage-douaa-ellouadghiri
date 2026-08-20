import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Zap, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('error', 'Veuillez remplir tous les champs');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      showToast('success', 'Connexion réussie');
      
      // Determine redirection based on the user role retrieved from local storage or context
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.role === 'administrateur') {
          navigate('/admin/dashboard');
        } else {
          navigate('/chat');
        }
      } else {
        navigate('/chat');
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Erreur lors de la connexion';
      showToast('error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-xl shadow-sm p-6 lg:p-8">
        
        {/* Header/Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary-500 text-white mb-3">
            <Zap className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-text-primary">CSELEC assistant</h2>
          <p className="text-sm text-text-secondary mt-1">Logiciel métier d'assistance technique</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm transition-all"
              disabled={isLoading}
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-sm font-medium text-text-primary" htmlFor="password">
                Mot de passe
              </label>
              <button
                type="button"
                onClick={() => showToast('info', 'Contactez votre administrateur pour réinitialiser votre mot de passe.')}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                tabIndex={-1}
              >
                Mot de passe oublié ?
              </button>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm transition-all"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connexion en cours...
              </>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
