import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import ToastContainer from './components/ui/ToastContainer';

// Technician Pages
import ChatPage from './pages/technician/ChatPage';
import HistoryPage from './pages/technician/HistoryPage';
import DocumentsPage from './pages/technician/DocumentsPage';
import ProfilePage from './pages/technician/ProfilePage';

// Admin Pages
import DashboardPage from './pages/admin/DashboardPage';
import DocumentManagementPage from './pages/admin/DocumentManagementPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import ConversationHistoryPage from './pages/admin/ConversationHistoryPage';
import SettingsPage from './pages/admin/SettingsPage';

// Route Protection Component
function PrivateRoute({ children, requiredRole }: { children: React.JSX.Element; requiredRole?: 'technicien' | 'administrateur' }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.statut !== 'actif') {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    // Redirect role mismatch safely
    return <Navigate to={user.role === 'administrateur' ? '/admin/dashboard' : '/chat'} replace />;
  }

  return children;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Login */}
            <Route path="/login" element={<LoginPage />} />

            {/* Authenticated Application */}
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <AppLayout />
                </PrivateRoute>
              }
            >
              {/* Default Redirect */}
              <Route index element={<Navigate to="/login" replace />} />

              {/* Technician Routes */}
              <Route
                path="chat"
                element={
                  <PrivateRoute>
                    <ChatPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="chat/:id"
                element={
                  <PrivateRoute>
                    <ChatPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="historique"
                element={
                  <PrivateRoute requiredRole="technicien">
                    <HistoryPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="documents"
                element={
                  <PrivateRoute requiredRole="technicien">
                    <DocumentsPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="profil"
                element={
                  <PrivateRoute requiredRole="technicien">
                    <ProfilePage />
                  </PrivateRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="admin/dashboard"
                element={
                  <PrivateRoute requiredRole="administrateur">
                    <DashboardPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="admin/documents"
                element={
                  <PrivateRoute requiredRole="administrateur">
                    <DocumentManagementPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="admin/utilisateurs"
                element={
                  <PrivateRoute requiredRole="administrateur">
                    <UserManagementPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="admin/historique"
                element={
                  <PrivateRoute requiredRole="administrateur">
                    <ConversationHistoryPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="admin/parametres"
                element={
                  <PrivateRoute requiredRole="administrateur">
                    <SettingsPage />
                  </PrivateRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          <ToastContainer />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
