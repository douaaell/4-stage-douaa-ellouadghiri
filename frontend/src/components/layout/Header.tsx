/**
 * Header — top bar with page title, model indicator, and user avatar.
 */
import { Menu, Bot } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  title?: string;
  onMobileMenuToggle: () => void;
}

export default function Header({ title, onMobileMenuToggle }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-border px-4 lg:px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            id="mobile-menu-toggle"
          >
            <Menu className="w-5 h-5 text-text-secondary" />
          </button>
          <h1 className="text-lg font-semibold text-text-primary">
            {title || 'CSELEC assistant'}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Model indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 rounded-full">
            <Bot className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary">Mistral AI</span>
          </div>

          {/* User avatar */}
          {user && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-medium">
                {user.nom.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:block text-sm font-medium text-text-primary">{user.nom}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
