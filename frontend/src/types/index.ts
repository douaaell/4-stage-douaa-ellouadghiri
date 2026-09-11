/**
 * TypeScript type definitions for the application.
 */

// ─── User ─────────────────────────────────────────
export interface User {
  id: number;
  nom: string;
  email: string;
  role: 'technicien' | 'administrateur';
  statut: 'actif' | 'inactif';
  date_creation: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface UserCreate {
  nom: string;
  email: string;
  mot_de_passe: string;
  role: string;
  statut: string;
}

export interface UserUpdate {
  nom?: string;
  email?: string;
  role?: string;
  statut?: string;
  mot_de_passe?: string;
}

export interface ProfileUpdate {
  nom?: string;
  email?: string;
  mot_de_passe?: string;
}

// ─── Document ─────────────────────────────────────
export interface Document {
  id: number;
  nom: string;
  chemin: string;
  categorie: string;
  description: string | null;
  taille: number | null;
  statut: string;
  date_import: string;
}

export interface DocumentUpdate {
  nom?: string;
  categorie?: string;
  description?: string;
}

// ─── Conversation ─────────────────────────────────
export interface SourceInfo {
  titre: string;
  page: number | string | null;
  extrait: string | null;
}

export interface Message {
  id: number;
  conversation_id: number;
  question: string;
  reponse: string;
  sources: SourceInfo[] | null;
  date: string;
}

export interface Conversation {
  id: number;
  user_id: number;
  titre: string;
  date_creation: string;
  message_count: number;
  user_nom?: string;
}

export interface ConversationDetail {
  id: number;
  user_id: number;
  titre: string;
  date_creation: string;
  messages: Message[];
  user_nom?: string;
}

// ─── Chat ─────────────────────────────────────────
export interface ChatRequest {
  question: string;
  conversation_id?: number;
}

export interface ChatResponse {
  conversation_id: number;
  question: string;
  reponse: string;
  sources: SourceInfo[];
}

// ─── Dashboard ────────────────────────────────────
export interface DashboardStats {
  total_users: number;
  total_technicians: number;
  total_conversations: number;
  total_documents: number;
  conversations_by_date: { date: string; count: number }[];
  documents_by_category: { categorie: string; count: number }[];
}
