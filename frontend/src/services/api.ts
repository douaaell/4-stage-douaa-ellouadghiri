/**
 * API service — centralized HTTP client for backend communication.
 */
import axios from 'axios';
import type {
  LoginRequest, TokenResponse, User, UserCreate, UserUpdate, ProfileUpdate,
  Document, DocumentUpdate, Conversation, ConversationDetail,
  ChatRequest, ChatResponse, DashboardStats,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 300000, // 5 minutes timeout for AI generation
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────
export const authApi = {
  login: (data: LoginRequest) =>
    api.post<TokenResponse>('/auth/login', data).then(r => r.data),
};

// ─── Users ────────────────────────────────────────
export const usersApi = {
  list: () =>
    api.get<User[]>('/users').then(r => r.data),
  
  get: (id: number) =>
    api.get<User>(`/users/${id}`).then(r => r.data),
  
  create: (data: UserCreate) =>
    api.post<User>('/users', data).then(r => r.data),
  
  update: (id: number, data: UserUpdate) =>
    api.put<User>(`/users/${id}`, data).then(r => r.data),
  
  delete: (id: number) =>
    api.delete(`/users/${id}`),
  
  getProfile: () =>
    api.get<User>('/users/me').then(r => r.data),
  
  updateProfile: (data: ProfileUpdate) =>
    api.put<User>('/users/me', data).then(r => r.data),
};

// ─── Documents ────────────────────────────────────
export const documentsApi = {
  list: (params?: { categorie?: string; search?: string }) =>
    api.get<Document[]>('/documents', { params }).then(r => r.data),
  
  get: (id: number) =>
    api.get<Document>(`/documents/${id}`).then(r => r.data),
  
  categories: () =>
    api.get<string[]>('/documents/categories').then(r => r.data),
  
  upload: (formData: FormData) =>
    api.post<Document>('/documents', formData, {
      headers: {
        'Content-Type': undefined
      }
    }).then(r => r.data),
  
  update: (id: number, data: DocumentUpdate) =>
    api.put<Document>(`/documents/${id}`, data).then(r => r.data),
  
  delete: (id: number) =>
    api.delete(`/documents/${id}`),
};

// ─── Conversations ────────────────────────────────
export const conversationsApi = {
  list: (params?: { search?: string }) =>
    api.get<Conversation[]>('/conversations', { params }).then(r => r.data),
  
  get: (id: number) =>
    api.get<ConversationDetail>(`/conversations/${id}`).then(r => r.data),

  create: (data?: { titre?: string }) =>
    api.post<Conversation>('/conversations', data).then(r => r.data),

  addMessage: (conversationId: number, question: string) =>
    api.post<ChatResponse>(`/conversations/${conversationId}/messages`, { question }).then(r => r.data),

  delete: (id: number) =>
    api.delete(`/conversations/${id}`),
};

// ─── Chat ─────────────────────────────────────────
export const chatApi = {
  send: (data: ChatRequest) =>
    api.post<ChatResponse>('/chat', data).then(r => r.data),
};

// ─── Stats ────────────────────────────────────────
export const statsApi = {
  dashboard: () =>
    api.get<DashboardStats>('/stats/dashboard').then(r => r.data),
};

export default api;
