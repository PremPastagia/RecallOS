import type { KnowledgeItem } from './types';

const mockKnowledgeBase: KnowledgeItem[] = [
  {
    id: 'k_001',
    title: 'First Principles Thinking',
    summary: 'Deconstruct problems to fundamental truths and reconstruct from the ground up.',
    fullContent: 'First principles thinking is the practice of actively questioning every assumption you think you know about a given problem or scenario, and then creating new knowledge and solutions from scratch. Almost like a newborn baby, you look at the facts and you decide for yourself what they mean.',
    createdAt: new Date().toISOString(),
    reviewState: {
      nextReviewDate: new Date().toISOString(),
      strength: 0.85,
      interval: 7,
      easeFactor: 2.5
    },
    relatedConcepts: [
      { id: 'k_002', title: 'Inversion Principle' }
    ],
    questions: [
      { id: 'q_001', question: 'Explain First Principles Thinking.', answer: 'Breaking down a problem to its fundamental, undeniable truths and reasoning up from there.' }
    ]
  },
  {
    id: 'k_002',
    title: 'Inversion Principle',
    summary: 'Address complex problems by considering the opposite of what you want to achieve.',
    fullContent: 'Inversion is a powerful thinking tool. Instead of asking "How can I succeed?", ask "How could I fail, and how can I avoid that?". Thinking forwards and backwards helps reveal hidden blind spots.',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    reviewState: {
      nextReviewDate: new Date(Date.now() + 86400000).toISOString(),
      strength: 0.60,
      interval: 3,
      easeFactor: 2.3
    },
    relatedConcepts: [
      { id: 'k_001', title: 'First Principles Thinking' },
      { id: 'k_003', title: 'Expected Value Framework' }
    ]
  },
  {
    id: 'k_003',
    title: 'Expected Value Framework',
    summary: 'Mathematical model for decisions with uncertain outcomes and probabilities.',
    fullContent: 'Expected value (EV) is an anticipated value for an investment at some point in the future. In decision making, you multiply the probability of an event by the value of the outcome, then sum them up for all possible events.',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    reviewState: {
      nextReviewDate: new Date(Date.now() + 172800000 * 2).toISOString(),
      strength: 0.92,
      interval: 14,
      easeFactor: 2.6
    },
    relatedConcepts: []
  },
  {
    id: 'k_004',
    title: 'Stoicism',
    summary: 'Focus on what you can control and accept what you cannot.',
    fullContent: 'Stoicism teaches the development of self-control and fortitude as a means of overcoming destructive emotions. It holds that becoming a clear and unbiased thinker allows one to understand the universal reason.',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    reviewState: {
      nextReviewDate: new Date(Date.now() - 86400000).toISOString(),
      strength: 0.30,
      interval: 1,
      easeFactor: 1.8
    },
    relatedConcepts: []
  },
  {
    id: 'k_005',
    title: 'Bayesian Updating',
    summary: 'Adjusting beliefs based on new evidence.',
    fullContent: 'Bayes Theorem provides a mathematical framework for updating our beliefs about the world as new evidence comes to light. The more surprising the evidence, the more you should update your priors.',
    createdAt: new Date().toISOString(),
    reviewState: {
      nextReviewDate: new Date().toISOString(),
      strength: 0.75,
      interval: 5,
      easeFactor: 2.4
    },
    relatedConcepts: [
      { id: 'k_003', title: 'Expected Value Framework' }
    ]
  }
];

export const KnowledgeService = {
  getAll: (): KnowledgeItem[] => {
    return [...mockKnowledgeBase];
  },
  
  getById: (id: string): KnowledgeItem | undefined => {
    return mockKnowledgeBase.find(item => item.id === id);
  },
  
  search: (query: string): KnowledgeItem[] => {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return [];
    
    return mockKnowledgeBase.filter(item => 
      item.title.toLowerCase().includes(lowerQuery) || 
      item.summary.toLowerCase().includes(lowerQuery)
    );
  },
  
  getDueForReview: (): KnowledgeItem[] => {
    const now = new Date().toISOString();
    return mockKnowledgeBase.filter(item => item.reviewState.nextReviewDate <= now);
  }
};
