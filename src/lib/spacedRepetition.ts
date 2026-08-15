import type { ReviewState, ReviewGrade } from './types';

/**
 * A simplified, deterministic spaced repetition algorithm.
 * Based roughly on SM-2 principles but simplified for this prototype.
 */
export function calculateNextReviewState(currentState: ReviewState, grade: ReviewGrade): ReviewState {
  let { strength, interval, easeFactor } = currentState;

  if (grade === 'Again') {
    // Reset interval but retain some ease memory
    interval = 1;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
    strength = Math.max(0, strength - 1);
  } else if (grade === 'Hard') {
    // Small interval increase
    interval = Math.max(1, Math.round(interval * 1.2));
    easeFactor = Math.max(1.3, easeFactor - 0.15);
  } else if (grade === 'Good') {
    // Normal interval increase
    interval = Math.max(1, Math.round(interval * easeFactor));
    strength += 1;
  } else if (grade === 'Easy') {
    // Larger interval increase
    interval = Math.max(1, Math.round(interval * easeFactor * 1.5));
    easeFactor += 0.15;
    strength += 2;
  }

  // Calculate the next review date by adding the interval (in days) to now
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);

  return {
    nextReviewDate: nextDate.toISOString(),
    strength,
    interval,
    easeFactor
  };
}
