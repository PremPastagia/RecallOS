import { useState, useEffect } from 'react';
import type { KnowledgeItem } from './types';

const HISTORY_KEY = 'smriti_exploration_history';
const MAX_HISTORY = 5;

interface HistoryItem {
  id: string;
  title: string;
}

export function useExplorationHistory(currentConcept?: KnowledgeItem | null) {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load initial history
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  }, []);

  // Update history when currentConcept changes
  useEffect(() => {
    if (!currentConcept) return;

    setHistory(prev => {
      // Don't add if it's the exact same as the last one
      if (prev.length > 0 && prev[prev.length - 1].id === currentConcept.id) {
        return prev;
      }
      
      const newHistory = [...prev, { id: currentConcept.id, title: currentConcept.title }];
      
      // Keep only last N items
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }

      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  }, [currentConcept]);

  return history;
}
