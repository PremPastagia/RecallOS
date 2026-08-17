import { supabase, isSupabaseConfigured } from './supabase';
import type { KnowledgeItem, RelatedConcept } from './types';
import { getDailyQueue, sortConceptsByPriority, PriorityLevel } from './memoryPlanner';

// Default seed data for local testing & offline fallback
const SEED_CONCEPTS: KnowledgeItem[] = [
  {
    id: 'k_1001',
    title: 'GARCH Model',
    summary: 'A statistical model used in econometrics to estimate the volatility of financial returns.',
    fullContent: 'Generalized AutoRegressive Conditional Heteroskedasticity (GARCH) is a statistical model used in analyzing time-series data where the variance error is believed to be serially autocorrelated. It is primarily used to model financial time series that exhibit time-varying volatility and volatility clustering.',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    reviewState: {
      nextReviewDate: new Date(Date.now() - 86400000).toISOString(),
      strength: 0,
      interval: 1,
      easeFactor: 2.5
    },
    relatedConcepts: []
  },
  {
    id: 'k_1002',
    title: 'First Principles Thinking',
    summary: 'A problem-solving approach that involves breaking down a problem into its fundamental truths.',
    fullContent: 'First principles thinking is the act of boiling a process down to the fundamental parts that you know are true and building up from there. It is one of the most effective strategies you can employ for dealing with complicated problems and generating original solutions. It also removes the impurity of assumptions and conventions.',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    reviewState: {
      nextReviewDate: new Date(Date.now() - 172800000).toISOString(),
      strength: 1,
      interval: 3,
      easeFactor: 2.6
    },
    relatedConcepts: []
  },
  {
    id: 'k_1003',
    title: 'Bullwhip Effect',
    summary: 'A supply chain phenomenon where small fluctuations in retail demand cause progressively larger fluctuations in wholesale, distributor, and manufacturer demand.',
    fullContent: 'The bullwhip effect occurs when the demand for a product changes, and those changes are amplified as they move further up the supply chain. This leads to inefficient production, excessive inventory, and higher costs.',
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    reviewState: {
      nextReviewDate: new Date(Date.now() + 86400000).toISOString(),
      strength: 2,
      interval: 7,
      easeFactor: 2.7
    },
    relatedConcepts: []
  },
  {
    id: 'k_1004',
    title: 'Pareidolia',
    summary: 'The psychological tendency to perceive a specific, often meaningful image in a random or ambiguous visual pattern.',
    fullContent: 'Pareidolia is a type of apophenia, which is a more generalized term for seeing patterns in random data. The most common form of pareidolia is seeing faces in inanimate objects, such as clouds, rocks, or toast.',
    createdAt: new Date(Date.now() - 345600000).toISOString(),
    reviewState: {
      nextReviewDate: new Date(Date.now() + 172800000).toISOString(),
      strength: 3,
      interval: 14,
      easeFactor: 2.8
    },
    relatedConcepts: []
  },
  {
    id: 'k_1005',
    title: 'Spaced Repetition',
    summary: 'An evidence-based learning technique that incorporates increasing intervals of time between subsequent review of previously learned material.',
    fullContent: 'Spaced repetition leverages the spacing effect, which asserts that learning is greater when studying is spread out over time. It is highly effective for vocabulary acquisition, law, medicine, and other fields requiring significant memorization.',
    createdAt: new Date(Date.now() - 432000000).toISOString(),
    reviewState: {
      nextReviewDate: new Date(Date.now() - 259200000).toISOString(),
      strength: 0,
      interval: 1,
      easeFactor: 2.5
    },
    relatedConcepts: []
  }
];

const SEED_RELATIONSHIPS: [string, string][] = [
  ['k_1001', 'k_1003'], // GARCH <-> Bullwhip Effect
  ['k_1001', 'k_1004'], // GARCH <-> Pareidolia
  ['k_1002', 'k_1005'], // First Principles <-> Spaced Repetition
  ['k_1002', 'k_1004'], // First Principles <-> Pareidolia
  ['k_1002', 'k_1001']  // First Principles <-> GARCH Model
];

const LOCAL_STORAGE_KEY = 'smriti_knowledge_items';
const LOCAL_STORAGE_RELS_KEY = 'smriti_related_concepts';

function getLocalStore(): { items: KnowledgeItem[]; rels: [string, string][] } {
  try {
    const rawItems = localStorage.getItem(LOCAL_STORAGE_KEY);
    const rawRels = localStorage.getItem(LOCAL_STORAGE_RELS_KEY);

    // If no data yet (first visit), seed with defaults
    const items: KnowledgeItem[] = rawItems ? JSON.parse(rawItems) : [...SEED_CONCEPTS];
    const rels: [string, string][] = rawRels ? JSON.parse(rawRels) : [...SEED_RELATIONSHIPS];

    return { items, rels };
  } catch {
    return { items: [...SEED_CONCEPTS], rels: [...SEED_RELATIONSHIPS] };
  }
}

function saveLocalStore(items: KnowledgeItem[], rels: [string, string][]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    localStorage.setItem(LOCAL_STORAGE_RELS_KEY, JSON.stringify(rels));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}

function getLocalRelated(id: string): RelatedConcept[] {
  const { items, rels } = getLocalStore();
  const relatedIds = new Set<string>();

  for (const [src, tgt] of rels) {
    if (src === id && tgt !== id) relatedIds.add(tgt);
    if (tgt === id && src !== id) relatedIds.add(src);
  }

  const results: RelatedConcept[] = [];
  for (const relId of relatedIds) {
    const target = items.find(i => i.id === relId);
    if (target) {
      results.push({
        id: target.id,
        title: target.title,
        summary: target.summary
      });
    }
  }
  return results;
}

export const KnowledgeService = {
  getAll: async (): Promise<KnowledgeItem[]> => {
    if (!isSupabaseConfigured) {
      const { items } = getLocalStore();
      return items.map(item => ({
        ...item,
        relatedConcepts: getLocalRelated(item.id)
      }));
    }

    try {
      const { data, error } = await supabase
        .from('knowledge_items')
        .select('*, review_states(*)')
        .order('created_at', { ascending: false });
        
      if (error || !data || data.length === 0) {
        const { items } = getLocalStore();
        return items.map(item => ({
          ...item,
          relatedConcepts: getLocalRelated(item.id)
        }));
      }
      
      return data.map(mapToKnowledgeItem);
    } catch {
      const { items } = getLocalStore();
      return items.map(item => ({
        ...item,
        relatedConcepts: getLocalRelated(item.id)
      }));
    }
  },

  getById: async (id: string): Promise<KnowledgeItem | undefined> => {
    if (!isSupabaseConfigured) {
      const { items } = getLocalStore();
      const found = items.find(i => i.id === id);
      if (!found) return undefined;
      return {
        ...found,
        relatedConcepts: getLocalRelated(found.id)
      };
    }

    try {
      const { data, error } = await supabase
        .from('knowledge_items')
        .select('*, review_states(*)')
        .eq('id', id)
        .single();
        
      if (error || !data) {
        const { items } = getLocalStore();
        const found = items.find(i => i.id === id);
        if (!found) return undefined;
        return {
          ...found,
          relatedConcepts: getLocalRelated(found.id)
        };
      }

      const item = mapToKnowledgeItem(data);
      item.relatedConcepts = await KnowledgeService.getRelatedConcepts(id);
      return item;
    } catch {
      const { items } = getLocalStore();
      const found = items.find(i => i.id === id);
      if (!found) return undefined;
      return {
        ...found,
        relatedConcepts: getLocalRelated(found.id)
      };
    }
  },

  getRelatedConcepts: async (id: string): Promise<RelatedConcept[]> => {
    if (!isSupabaseConfigured) {
      return getLocalRelated(id);
    }

    try {
      // 1. Fetch relationships from related_concepts table (both directions)
      const [outRes, inRes] = await Promise.all([
        supabase.from('related_concepts').select('target_item_id').eq('source_item_id', id),
        supabase.from('related_concepts').select('source_item_id').eq('target_item_id', id)
      ]);

      const relatedIds = new Set<string>();
      outRes.data?.forEach(r => r.target_item_id && relatedIds.add(r.target_item_id));
      inRes.data?.forEach(r => r.source_item_id && relatedIds.add(r.source_item_id));
      relatedIds.delete(id);

      if (relatedIds.size === 0) {
        return getLocalRelated(id);
      }

      // 2. Fetch concept details for all valid target items
      const { data: items, error } = await supabase
        .from('knowledge_items')
        .select('id, title, summary')
        .in('id', Array.from(relatedIds));

      if (error || !items || items.length === 0) {
        return getLocalRelated(id);
      }

      // Gracefully filter out invalid or deleted items
      return items
        .filter(item => item && item.id && item.title)
        .map(item => ({
          id: item.id,
          title: item.title,
          summary: item.summary || ''
        }));
    } catch {
      return getLocalRelated(id);
    }
  },

  getAllConnections: async (): Promise<{ source: string; target: string; sourceTitle: string; targetTitle: string }[]> => {
    if (!isSupabaseConfigured) {
      const { items, rels } = getLocalStore();
      const itemMap = new Map(items.map(i => [i.id, i.title]));
      return rels
        .filter(([src, tgt]) => itemMap.has(src) && itemMap.has(tgt))
        .map(([src, tgt]) => ({
          source: src,
          target: tgt,
          sourceTitle: itemMap.get(src) || src,
          targetTitle: itemMap.get(tgt) || tgt
        }));
    }

    try {
      const { data: relsData, error: relsErr } = await supabase
        .from('related_concepts')
        .select('source_item_id, target_item_id');

      if (relsErr || !relsData || relsData.length === 0) {
        const { items, rels } = getLocalStore();
        const itemMap = new Map(items.map(i => [i.id, i.title]));
        return rels
          .filter(([src, tgt]) => itemMap.has(src) && itemMap.has(tgt))
          .map(([src, tgt]) => ({
            source: src,
            target: tgt,
            sourceTitle: itemMap.get(src) || src,
            targetTitle: itemMap.get(tgt) || tgt
          }));
      }

      const allItems = await KnowledgeService.getAll();
      const itemMap = new Map(allItems.map(i => [i.id, i.title]));

      return relsData
        .filter(r => itemMap.has(r.source_item_id) && itemMap.has(r.target_item_id))
        .map(r => ({
          source: r.source_item_id,
          target: r.target_item_id,
          sourceTitle: itemMap.get(r.source_item_id) || r.source_item_id,
          targetTitle: itemMap.get(r.target_item_id) || r.target_item_id
        }));
    } catch {
      const { items, rels } = getLocalStore();
      const itemMap = new Map(items.map(i => [i.id, i.title]));
      return rels
        .filter(([src, tgt]) => itemMap.has(src) && itemMap.has(tgt))
        .map(([src, tgt]) => ({
          source: src,
          target: tgt,
          sourceTitle: itemMap.get(src) || src,
          targetTitle: itemMap.get(tgt) || tgt
        }));
    }
  },

  search: async (query: string): Promise<KnowledgeItem[]> => {
    if (!isSupabaseConfigured) {
      const { items } = getLocalStore();
      const q = query.toLowerCase();
      return items.filter(i => i.title.toLowerCase().includes(q) || i.summary.toLowerCase().includes(q));
    }

    try {
      const { data, error } = await supabase
        .from('knowledge_items')
        .select('*, review_states(*)')
        .ilike('title', `%${query}%`);
        
      if (error || !data || data.length === 0) {
        const { items } = getLocalStore();
        const q = query.toLowerCase();
        return items.filter(i => i.title.toLowerCase().includes(q) || i.summary.toLowerCase().includes(q));
      }
      return data.map(mapToKnowledgeItem);
    } catch {
      const { items } = getLocalStore();
      const q = query.toLowerCase();
      return items.filter(i => i.title.toLowerCase().includes(q) || i.summary.toLowerCase().includes(q));
    }
  },

  getDueForReview: async (): Promise<KnowledgeItem[]> => {
    const all = await KnowledgeService.getAll();
    return getDailyQueue(all);
  },

  getWeakConcepts: async (): Promise<KnowledgeItem[]> => {
    const all = await KnowledgeService.getAll();
    // We want the top items that are actually weak, prioritized by the planner
    // (OVERDUE_WEAK and WEAK are priorities 1 and 3)
    const sorted = sortConceptsByPriority(all);
    const weak = sorted
      .filter(entry => entry.item.reviewState.strength <= 1)
      .map(entry => entry.item);
    return weak.slice(0, 3);
  },

  getRecentlyLearned: async (): Promise<KnowledgeItem[]> => {
    const all = await KnowledgeService.getAll();
    // Prioritize NEWLY_LEARNED, then fallback to descending createdAt
    const sorted = sortConceptsByPriority(all);
    const newlyLearned = sorted
      .filter(entry => entry.priority === PriorityLevel.NEWLY_LEARNED)
      .map(entry => entry.item);
      
    if (newlyLearned.length >= 4) {
      return newlyLearned.slice(0, 4);
    }
    
    // If we don't have enough strictly "newly learned" by the planner's definition,
    // just return the 4 most recently created items overall.
    const byDate = [...all].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return byDate.slice(0, 4);
  },

  getTotalCount: async (): Promise<number> => {
    if (!isSupabaseConfigured) {
      const { items } = getLocalStore();
      return items.length;
    }

    try {
      const { count, error } = await supabase
        .from('knowledge_items')
        .select('*', { count: 'exact', head: true });
        
      if (error || count === null) {
        const { items } = getLocalStore();
        return items.length;
      }
      return count;
    } catch {
      const { items } = getLocalStore();
      return items.length;
    }
  },

  getRandomConcept: async (): Promise<KnowledgeItem | undefined> => {
    const all = await KnowledgeService.getAll();
    if (all.length === 0) return undefined;
    const randomIndex = Math.floor(Math.random() * all.length);
    return all[randomIndex];
  },

  addConcept: async (concept: KnowledgeItem): Promise<void> => {
    // 1. Local store persistence
    const { items, rels } = getLocalStore();
    const updatedItems = [concept, ...items.filter(i => i.id !== concept.id)];
    const newRels: [string, string][] = [...rels];

    if (concept.relatedConcepts && concept.relatedConcepts.length > 0) {
      for (const rel of concept.relatedConcepts) {
        const exists = newRels.some(([s, t]) => (s === concept.id && t === rel.id) || (s === rel.id && t === concept.id));
        if (!exists) {
          newRels.push([concept.id, rel.id]);
        }
      }
    }
    saveLocalStore(updatedItems, newRels);

    if (!isSupabaseConfigured) return;

    // 2. Supabase persistence if authenticated
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error: itemError } = await supabase
        .from('knowledge_items')
        .insert({
          id: concept.id,
          user_id: session.user.id,
          title: concept.title,
          summary: concept.summary,
          full_content: concept.fullContent,
          embedding: concept.embedding,
          created_at: concept.createdAt
        });
        
      if (itemError) console.warn('Supabase knowledge_items insert warning:', itemError);

      const { error: reviewError } = await supabase
        .from('review_states')
        .insert({
          item_id: concept.id,
          next_review_date: concept.reviewState.nextReviewDate,
          strength: concept.reviewState.strength,
          interval: concept.reviewState.interval,
          ease_factor: concept.reviewState.easeFactor
        });
        
      if (reviewError) console.warn('Supabase review_states insert warning:', reviewError);

      if (concept.relatedConcepts && concept.relatedConcepts.length > 0) {
        const relations = concept.relatedConcepts.map(rel => ({
          source_item_id: concept.id,
          target_item_id: rel.id
        }));
        const { error: relError } = await supabase.from('related_concepts').insert(relations);
        if (relError) console.warn('Supabase related_concepts insert warning:', relError);
      }
    } catch (e) {
      console.warn('Supabase insert skipped or failed:', e);
    }
  },

  updateConcept: async (id: string, updates: Partial<KnowledgeItem>): Promise<void> => {
    // 1. Local store persistence
    const { items, rels } = getLocalStore();
    const existingIndex = items.findIndex(i => i.id === id);
    if (existingIndex > -1) {
      items[existingIndex] = { ...items[existingIndex], ...updates };
      saveLocalStore(items, rels);
    }

    if (!isSupabaseConfigured) return;

    // 2. Supabase persistence
    try {
      const payload: any = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.summary !== undefined) payload.summary = updates.summary;
      if (updates.fullContent !== undefined) payload.full_content = updates.fullContent;
      if (updates.embedding !== undefined) payload.embedding = updates.embedding;

      if (Object.keys(payload).length > 0) {
        const { error } = await supabase
          .from('knowledge_items')
          .update(payload)
          .eq('id', id);
          
        if (error) console.warn('Supabase knowledge_items update warning:', error);
      }
    } catch (e) {
      console.warn('Supabase update skipped or failed:', e);
    }
  },

  checkDuplicateTitle: async (title: string, ignoreId?: string): Promise<KnowledgeItem | undefined> => {
    const all = await KnowledgeService.getAll();
    const normalizedTitle = title.toLowerCase().trim();
    return all.find(item => item.title.toLowerCase().trim() === normalizedTitle && item.id !== ignoreId);
  },

  updateReviewState: async (itemId: string, newState: any): Promise<void> => {
    const { items, rels } = getLocalStore();
    const target = items.find(i => i.id === itemId);
    if (target) {
      target.reviewState = {
        nextReviewDate: newState.nextReviewDate,
        strength: newState.strength,
        interval: newState.interval,
        easeFactor: newState.easeFactor
      };
      saveLocalStore(items, rels);
    }

    if (!isSupabaseConfigured) return;

    try {
      await supabase
        .from('review_states')
        .update({
          next_review_date: newState.nextReviewDate,
          strength: newState.strength,
          interval: newState.interval,
          ease_factor: newState.easeFactor
        })
        .eq('item_id', itemId);
    } catch (e) {
      console.warn('Supabase updateReviewState warning:', e);
    }
  },

  addConnection: async (sourceId: string, targetId: string): Promise<void> => {
    if (sourceId === targetId) return;

    // 1. Local Store
    const { items, rels } = getLocalStore();
    const exists = rels.some(([s, t]) => (s === sourceId && t === targetId) || (s === targetId && t === sourceId));
    if (!exists) {
      saveLocalStore(items, [...rels, [sourceId, targetId]]);
    }

    if (!isSupabaseConfigured) return;

    // 2. Supabase
    try {
      // Check if it already exists to avoid duplicate rows, though UI should prevent this.
      const { data } = await supabase
        .from('related_concepts')
        .select('*')
        .or(`and(source_item_id.eq.${sourceId},target_item_id.eq.${targetId}),and(source_item_id.eq.${targetId},target_item_id.eq.${sourceId})`);
      
      if (!data || data.length === 0) {
        await supabase.from('related_concepts').insert({
          source_item_id: sourceId,
          target_item_id: targetId
        });
      }
    } catch (e) {
      console.warn('Supabase addConnection failed:', e);
    }
  },

  removeConnection: async (sourceId: string, targetId: string): Promise<void> => {
    // 1. Local Store
    const { items, rels } = getLocalStore();
    const newRels = rels.filter(([s, t]) => !((s === sourceId && t === targetId) || (s === targetId && t === sourceId)));
    saveLocalStore(items, newRels);

    if (!isSupabaseConfigured) return;

    // 2. Supabase
    try {
      await supabase
        .from('related_concepts')
        .delete()
        .or(`and(source_item_id.eq.${sourceId},target_item_id.eq.${targetId}),and(source_item_id.eq.${targetId},target_item_id.eq.${sourceId})`);
    } catch (e) {
      console.warn('Supabase removeConnection failed:', e);
    }
  },

  deleteConcept: async (id: string): Promise<void> => {
    // 1. Local Store — remove item, all relationships, back-references from other items
    const { items, rels } = getLocalStore();

    // Filter out the deleted item and any relationships involving it
    const updatedItems = items
      .filter(i => i.id !== id)
      .map(i => ({
        ...i,
        relatedConcepts: (i.relatedConcepts || []).filter(r => r.id !== id)
      }));
    const updatedRels = rels.filter(([s, t]) => s !== id && t !== id);
    saveLocalStore(updatedItems, updatedRels);

    if (!isSupabaseConfigured) return;

    // 2. Supabase — enforce user ownership via RLS; delete in safe order
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.warn('deleteConcept: no authenticated user, aborting Supabase delete');
        return;
      }

      // Delete relationships (both directions)
      await supabase
        .from('related_concepts')
        .delete()
        .or(`source_item_id.eq.${id},target_item_id.eq.${id}`);

      // Delete review state
      await supabase
        .from('review_states')
        .delete()
        .eq('item_id', id);

      // Delete knowledge item — RLS ensures only the owner can delete
      const { error } = await supabase
        .from('knowledge_items')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id);

      if (error) console.warn('Supabase deleteConcept warning:', error);
    } catch (e) {
      console.warn('Supabase deleteConcept failed:', e);
    }
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
    relatedConcepts: []
  };
}
