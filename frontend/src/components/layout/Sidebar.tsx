/**
 * Sidebar — vertical fixed navigation with role-based menu items.
 */
import { NavLink, useNavigate } from 'react-router-dom';
import {
  MessageSquare, Clock, FileText, User, LogOut,
  LayoutDashboard, Users, Settings, Zap, ChevronLeft, Menu, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onToggleCollapse: () => void;
  onMobileClose: () => void;
}

export default function Sidebar({ isCollapsed, isMobileOpen, onToggleCollapse, onMobileClose }: SidebarProps) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const technicianMenu = [
    { to: '/chat', icon: MessageSquare, label: 'Nouvelle question' },
    { to: '/historique', icon: Clock, label: 'Historique' },
    { to: '/documents', icon: FileText, label: 'Documents' },
    { to: '/profil', icon: User, label: 'Profil' },
  ];

  const adminMenu = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/admin/documents', icon: FileText, label: 'Documents' },
    { to: '/admin/utilisateurs', icon: Users, label: 'Utilisateurs' },
    { to: '/admin/historique', icon: Clock, label: 'Historique des conversations' },
    { to: '/admin/parametres', icon: Settings, label: 'Paramètres' },
  ];

  const menuItems = isAdmin ? adminMenu : technicianMenu;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-primary-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-500 flex-shrink-0">
          <Zap className="w-5 h-5" />
        </div>
        {!isCollapsed && (
          <div className="leading-tight">
            <div className="font-semibold text-sm">CSELEC</div>
            <div className="text-xs text-blue-300">assistant</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onMobileClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-primary-500 text-white font-medium'
                  : 'text-blue-200 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User section + Logout */}
      <div className="border-t border-white/10 p-3">
        {!isCollapsed && user && (
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-sm font-medium flex-shrink-0">
              {user.nom.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{user.nom}</div>
              <div className="text-xs text-blue-300 capitalize">{user.role}</div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-blue-200 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>Déconnexion</span>}
        </button>
      </div>

      {/* Collapse toggle (desktop only) */}
      <button
        onClick={onToggleCollapse}
        className="hidden lg:flex items-center justify-center py-3 border-t border-white/10 text-blue-300 hover:text-white transition-colors"
      >
        <ChevronLeft className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform lg:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={onMobileClose}
          className="absolute top-4 right-4 text-blue-200 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <div
        className={`hidden lg:block fixed inset-y-0 left-0 z-30 sidebar-transition ${
          isCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
}
