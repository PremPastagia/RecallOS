import type { KnowledgeItem } from './types';

export const PriorityLevel = {
  OVERDUE_WEAK: 1,
  OVERDUE: 2,
  WEAK: 3,
  NEWLY_LEARNED: 4,
  REMAINING_DUE: 5,
  NONE: 6
} as const;

export type PriorityLevel = typeof PriorityLevel[keyof typeof PriorityLevel];

export function determinePriority(item: KnowledgeItem, now: Date): PriorityLevel {
  const nextReview = new Date(item.reviewState.nextReviewDate).getTime();
  const isWeak = item.reviewState.strength <= 1;
  
  // Newly learned defined as created within the last 3 days
  const createdTime = new Date(item.createdAt).getTime();
  const isNewlyLearned = (now.getTime() - createdTime) <= 3 * 24 * 60 * 60 * 1000;
  
  // Overdue means strictly before the start of "now" day
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  
  const isStrictlyOverdue = nextReview < startOfToday.getTime();
  // Due means nextReviewDate is <= now
  const isDue = nextReview <= now.getTime();
  
  if (isStrictlyOverdue && isWeak) return PriorityLevel.OVERDUE_WEAK;
  if (isStrictlyOverdue) return PriorityLevel.OVERDUE;
  if (isWeak) return PriorityLevel.WEAK; // even if not due, it's weak so we proactively review
  if (isNewlyLearned) return PriorityLevel.NEWLY_LEARNED;
  if (isDue) return PriorityLevel.REMAINING_DUE;
  
  return PriorityLevel.NONE;
}

export function sortConceptsByPriority(items: KnowledgeItem[], now = new Date()): { item: KnowledgeItem, priority: PriorityLevel }[] {
  const scored = items.map(item => ({
    item,
    priority: determinePriority(item, now)
  }));
  
  scored.sort((a, b) => {
    // 1. Sort by Priority Level (lower number is higher priority)
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    // 2. Tie breaker: Oldest nextReviewDate first
    const aNext = new Date(a.item.reviewState.nextReviewDate).getTime();
    const bNext = new Date(b.item.reviewState.nextReviewDate).getTime();
    if (aNext !== bNext) return aNext - bNext;
    
    // 3. Tie breaker: Oldest createdAt first
    const aCreated = new Date(a.item.createdAt).getTime();
    const bCreated = new Date(b.item.createdAt).getTime();
    if (aCreated !== bCreated) return aCreated - bCreated;
    
    // 4. Stable tie breaker: ID comparison
    return a.item.id.localeCompare(b.item.id);
  });
  
  // Deduplicate by ID
  const seen = new Set<string>();
  const uniqueScored: { item: KnowledgeItem, priority: PriorityLevel }[] = [];
  
  for (const entry of scored) {
    if (!seen.has(entry.item.id)) {
      seen.add(entry.item.id);
      uniqueScored.push(entry);
    }
  }
  
  return uniqueScored;
}

export function getDailyQueue(items: KnowledgeItem[], limit = 20, now = new Date()): KnowledgeItem[] {
  const sorted = sortConceptsByPriority(items, now);
  
  // Only include items that actually have a priority (1 to 5)
  const validQueue = sorted
    .filter(entry => entry.priority !== PriorityLevel.NONE)
    .map(entry => entry.item);
    
  return validQueue.slice(0, limit);
}
