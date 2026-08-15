import { supabase, isSupabaseConfigured } from './supabase';
import type { KnowledgeItem, Question, ReviewGrade } from './types';

export interface PendingEvaluation {
  showEvaluation: boolean;
  selectedOption: string | null;
  directRecallAnswer: string;
}

export interface ReviewSessionData {
  id: string;
  userId: string;
  items: KnowledgeItem[];
  questions: Question[];
  currentIndex: number;
  sessionResults: { id: string; title: string; grade: ReviewGrade; nextReviewDate: string }[];
  pendingEvaluation?: PendingEvaluation;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'completed';
}

const SESSION_KEY = 'smriti_active_review_session';

export const ReviewSessionManager = {
  async getCurrentUserId(): Promise<string> {
    if (!isSupabaseConfigured) return 'local_user';
    try {
      const { data } = await supabase.auth.getSession();
      return data?.session?.user?.id || 'local_user';
    } catch {
      return 'local_user';
    }
  },

  async getActiveSession(): Promise<ReviewSessionData | null> {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      
      const session: ReviewSessionData = JSON.parse(raw);
      if (session.status !== 'active') return null;
      
      const userId = await this.getCurrentUserId();
      if (session.userId !== userId) {
        // Discard session from another user
        this.clearSession();
        return null;
      }
      
      // Validate schema (basic)
      if (!session.id || !Array.isArray(session.questions) || typeof session.currentIndex !== 'number') {
        this.clearSession();
        return null;
      }
      
      return session;
    } catch {
      this.clearSession();
      return null;
    }
  },

  async saveSession(session: ReviewSessionData): Promise<void> {
    try {
      session.updatedAt = new Date().toISOString();
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      console.error('Failed to save review session', e);
    }
  },

  async createSession(items: KnowledgeItem[], questions: Question[]): Promise<ReviewSessionData> {
    const userId = await this.getCurrentUserId();
    const session: ReviewSessionData = {
      id: `session_${Date.now()}`,
      userId,
      items,
      questions,
      currentIndex: 0,
      sessionResults: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active'
    };
    await this.saveSession(session);
    return session;
  },

  clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
  }
};
