import { supabase } from './supabase';
import type { KnowledgeItem } from './types';

export const KnowledgeService = {
  getAll: async (): Promise<KnowledgeItem[]> => {
    const { data, error } = await supabase
      .from('knowledge_items')
      .select('*, review_states(*)')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return data.map(mapToKnowledgeItem);
  },

  getById: async (id: string): Promise<KnowledgeItem | undefined> => {
    const { data, error } = await supabase
      .from('knowledge_items')
      .select('*, review_states(*)')
      .eq('id', id)
      .single();
      
    if (error || !data) return undefined;
    return mapToKnowledgeItem(data);
  },

  search: async (query: string): Promise<KnowledgeItem[]> => {
    const { data, error } = await supabase
      .from('knowledge_items')
      .select('*, review_states(*)')
      .ilike('title', `%${query}%`);
      
    if (error) throw error;
    return data.map(mapToKnowledgeItem);
  },

  getDueForReview: async (): Promise<KnowledgeItem[]> => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('knowledge_items')
      .select('*, review_states!inner(*)')
      .lte('review_states.next_review_date', now);
      
    if (error) throw error;
    return data.map(mapToKnowledgeItem);
  },

  addConcept: async (concept: KnowledgeItem): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('User not authenticated');

    // 1. Insert into knowledge_items
    const { error: itemError } = await supabase
      .from('knowledge_items')
      .insert({
        id: concept.id,
        user_id: session.user.id,
        title: concept.title,
        summary: concept.summary,
        full_content: concept.fullContent,
        embedding: concept.embedding, // Added for semantic search
        created_at: concept.createdAt
      });
      
    if (itemError) throw itemError;

    // 2. Insert into review_states
    const { error: reviewError } = await supabase
      .from('review_states')
      .insert({
        item_id: concept.id,
        next_review_date: concept.reviewState.nextReviewDate,
        strength: concept.reviewState.strength,
        interval: concept.reviewState.interval,
        ease_factor: concept.reviewState.easeFactor
      });
      
    if (reviewError) throw reviewError;
    
    // Optional: handle related concepts if needed
  },

  updateReviewState: async (itemId: string, newState: any): Promise<void> => {
    const { error } = await supabase
      .from('review_states')
      .update({
        next_review_date: newState.nextReviewDate,
        strength: newState.strength,
        interval: newState.interval,
        ease_factor: newState.easeFactor
      })
      .eq('item_id', itemId);
      
    if (error) throw error;
  }
};

function mapToKnowledgeItem(row: any): KnowledgeItem {
  const reviewData = Array.isArray(row.review_states) ? row.review_states[0] : row.review_states;
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    fullContent: row.full_content,
    createdAt: row.created_at,
    reviewState: reviewData ? {
      nextReviewDate: reviewData.next_review_date,
      strength: reviewData.strength,
      interval: reviewData.interval,
      easeFactor: reviewData.ease_factor
    } : {
      nextReviewDate: new Date().toISOString(),
      strength: 0,
      interval: 1,
      easeFactor: 2.5
    },
    embedding: row.embedding,
    relatedConcepts: [] // Skipping full resolution for brevity in prototype
  };
}
