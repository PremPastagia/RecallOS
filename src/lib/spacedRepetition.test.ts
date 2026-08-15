import { test } from 'node:test';
import assert from 'node:assert';
import { calculateNextReviewState } from './spacedRepetition.ts';
import type { ReviewState } from './types.ts';

test('calculateNextReviewState - Again', () => {
  const currentState: ReviewState = {
    nextReviewDate: new Date().toISOString(),
    strength: 2,
    interval: 7,
    easeFactor: 2.5
  };
  
  const newState = calculateNextReviewState(currentState, 'Again');
  
  assert.strictEqual(newState.interval, 1, 'Interval should reset to 1');
  assert.strictEqual(newState.strength, 1, 'Strength should decrease by 1');
  assert.strictEqual(newState.easeFactor, 2.3, 'Ease factor should decrease by 0.2');
  
  const nextDate = new Date(newState.nextReviewDate);
  const now = new Date();
  const diffTime = Math.abs(nextDate.getTime() - now.getTime());
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  assert.strictEqual(diffDays, 1, 'Next review should be in 1 day');
});

test('calculateNextReviewState - Hard', () => {
  const currentState: ReviewState = {
    nextReviewDate: new Date().toISOString(),
    strength: 2,
    interval: 7,
    easeFactor: 2.5
  };
  
  const newState = calculateNextReviewState(currentState, 'Hard');
  
  assert.strictEqual(newState.interval, 8, 'Interval should increase slightly (7 * 1.2 = 8)');
  assert.strictEqual(newState.strength, 2, 'Strength should remain the same');
  assert.strictEqual(newState.easeFactor, 2.35, 'Ease factor should decrease by 0.15');
});

test('calculateNextReviewState - Good', () => {
  const currentState: ReviewState = {
    nextReviewDate: new Date().toISOString(),
    strength: 2,
    interval: 7,
    easeFactor: 2.5
  };
  
  const newState = calculateNextReviewState(currentState, 'Good');
  
  assert.strictEqual(newState.interval, 18, 'Interval should increase normally (7 * 2.5 = 17.5 -> 18)');
  assert.strictEqual(newState.strength, 3, 'Strength should increase by 1');
  assert.strictEqual(newState.easeFactor, 2.5, 'Ease factor should remain the same');
});

test('calculateNextReviewState - Easy', () => {
  const currentState: ReviewState = {
    nextReviewDate: new Date().toISOString(),
    strength: 2,
    interval: 7,
    easeFactor: 2.5
  };
  
  const newState = calculateNextReviewState(currentState, 'Easy');
  
  assert.strictEqual(newState.interval, 26, 'Interval should increase aggressively (7 * 2.5 * 1.5 = 26.25 -> 26)');
  assert.strictEqual(newState.strength, 4, 'Strength should increase by 2');
  assert.strictEqual(newState.easeFactor, 2.65, 'Ease factor should increase by 0.15');
});
