export interface RelatedConcept {
  id: string;
  title: string;
}

export type ReviewGrade = 'Again' | 'Hard' | 'Good' | 'Easy';

export interface Question {
  id: string; // concept id
  conceptTitle: string;
  type: 'multiple_choice' | 'direct_recall';
  question: string;
  options?: string[]; // for multiple choice
  correctAnswer: string;
  explanation: string;
}

export interface ReviewQuestion {
  id: string;
  question: string;
  answer: string;
}

export interface ReviewState {
  nextReviewDate: string; // ISO format date string
  strength: number;       // 0 to 1
  interval: number;       // Days between reviews
  easeFactor: number;     // SM-2 algorithm style ease factor
}

export interface KnowledgeItem {
  id: string;
  title: string;
  summary: string;
  fullContent: string;
  createdAt: string;
  reviewState: ReviewState;
  relatedConcepts: RelatedConcept[];
  questions?: ReviewQuestion[];
  embedding?: number[];
}
