import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sortConceptsByPriority, getDailyQueue, PriorityLevel, determinePriority } from './memoryPlanner';
import type { KnowledgeItem, ReviewState } from './types';

// Helper to create a mock item
function createMockItem(
  id: string,
  nowMs: number,
  createdAtOffsetDays: number,
  nextReviewOffsetDays: number,
  strength: number
): KnowledgeItem {
  const createdAt = new Date(nowMs + createdAtOffsetDays * 86400000).toISOString();
  const nextReviewDate = new Date(nowMs + nextReviewOffsetDays * 86400000).toISOString();
  
  return {
    id,
    title: `Concept ${id}`,
    summary: 'Summary',
    fullContent: 'Content',
    createdAt,
    reviewState: {
      nextReviewDate,
      strength,
      interval: 1,
      easeFactor: 2.5
    },
    relatedConcepts: []
  };
}

describe('memoryPlanner', () => {
  const now = new Date(); // Use constant now for deterministic tests
  
  it('correctly assigns priority levels', () => {
    const nowMs = now.getTime();
    // 1. OVERDUE_WEAK: past due by 2 days, strength 0
    const overdueWeak = createMockItem('1', nowMs, -10, -2, 0);
    assert.strictEqual(determinePriority(overdueWeak, now), PriorityLevel.OVERDUE_WEAK);
    
    // 2. OVERDUE: past due by 2 days, strength 2
    const overdue = createMockItem('2', nowMs, -10, -2, 2);
    assert.strictEqual(determinePriority(overdue, now), PriorityLevel.OVERDUE);
    
    // 3. WEAK: due tomorrow, strength 1
    const weak = createMockItem('3', nowMs, -10, 1, 1);
    assert.strictEqual(determinePriority(weak, now), PriorityLevel.WEAK);
    
    // 4. NEWLY_LEARNED: created yesterday, due tomorrow, strength 2
    const newlyLearned = createMockItem('4', nowMs, -1, 1, 2);
    assert.strictEqual(determinePriority(newlyLearned, now), PriorityLevel.NEWLY_LEARNED);
    
    // 5. REMAINING_DUE: created 10 days ago, due exactly now, strength 2
    const remainingDue = createMockItem('5', nowMs, -10, 0, 2);
    assert.strictEqual(determinePriority(remainingDue, now), PriorityLevel.REMAINING_DUE);
    
    // 6. NONE: created 10 days ago, due in 5 days, strength 2
    const none = createMockItem('6', nowMs, -10, 5, 2);
    assert.strictEqual(determinePriority(none, now), PriorityLevel.NONE);
  });

  it('sorts concepts in exact deterministic priority order', () => {
    const nowMs = now.getTime();
    const i1 = createMockItem('1_none', nowMs, -10, 5, 2);
    const i2 = createMockItem('2_due', nowMs, -10, 0, 2);
    const i3 = createMockItem('3_new', nowMs, -1, 1, 2);
    const i4 = createMockItem('4_weak', nowMs, -10, 1, 1);
    const i5 = createMockItem('5_overdue', nowMs, -10, -2, 2);
    const i6 = createMockItem('6_overdueWeak', nowMs, -10, -2, 0);

    const unsorted = [i1, i2, i3, i4, i5, i6];
    const sorted = sortConceptsByPriority(unsorted, now).map(entry => entry.item);
    
    assert.strictEqual(sorted[0].id, '6_overdueWeak');
    assert.strictEqual(sorted[1].id, '5_overdue');
    assert.strictEqual(sorted[2].id, '4_weak');
    assert.strictEqual(sorted[3].id, '3_new');
    assert.strictEqual(sorted[4].id, '2_due');
    assert.strictEqual(sorted[5].id, '1_none');
  });

  it('breaks ties using nextReviewDate (older first)', () => {
    const nowMs = now.getTime();
    // Both are OVERDUE_WEAK
    const olderNext = createMockItem('older', nowMs, -10, -3, 0);
    const newerNext = createMockItem('newer', nowMs, -10, -1, 0);
    
    const sorted = sortConceptsByPriority([newerNext, olderNext], now).map(e => e.item);
    assert.strictEqual(sorted[0].id, 'older');
    assert.strictEqual(sorted[1].id, 'newer');
  });

  it('safely filters out NONE and caps at limit', () => {
    const nowMs = now.getTime();
    // Generate 25 OVERDUE items
    const items = Array.from({ length: 25 }, (_, i) => createMockItem(`due_${i}`, nowMs, -10, -1, 2));
    // Add 5 NONE items
    items.push(...Array.from({ length: 5 }, (_, i) => createMockItem(`none_${i}`, nowMs, -10, 5, 2)));
    
    const queue = getDailyQueue(items, 20, now);
    
    assert.strictEqual(queue.length, 20);
    assert.ok(queue.every(item => item.id.startsWith('due_')));
  });

  it('removes duplicates', () => {
    const nowMs = now.getTime();
    const item = createMockItem('1', nowMs, -10, -2, 0);
    const queue = getDailyQueue([item, item, item], 20, now);
    assert.strictEqual(queue.length, 1);
  });

  it('handles empty vault', () => {
    const queue = getDailyQueue([], 20, now);
    assert.strictEqual(queue.length, 0);
  });
});
