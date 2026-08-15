import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KnowledgeService } from '../lib/dataService';
import type { KnowledgeItem } from '../lib/types';

export function AddConcept() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCommit = async () => {
    if (!title.trim() || !content.trim()) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Get a list of existing concepts for deduplication context
      const allConcepts = await KnowledgeService.getAll();
      const existingConcepts = allConcepts.map((c: KnowledgeItem) => ({
        id: c.id,
        title: c.title,
        summary: c.summary
      }));

      const response = await fetch('/api/generate-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, existingConcepts })
      });

      if (!response.ok) {
        throw new Error('Failed to generate concept from server');
      }

      const data = await response.json();

      if (data.isDuplicate && data.duplicateOfId) {
        // Navigate to the existing duplicate concept instead of creating a new one
        navigate(`/knowledge/${data.duplicateOfId}`);
        return;
      }

      // It's a new concept, construct the KnowledgeItem
      const newId = `k_${Date.now()}`;
      const newConcept: KnowledgeItem = {
        id: newId,
        title: data.title,
        summary: data.summary,
        fullContent: data.fullContent,
        createdAt: new Date().toISOString(),
        reviewState: {
          nextReviewDate: new Date().toISOString(),
          strength: 0,
          interval: 1,
          easeFactor: 2.5
        },
        relatedConcepts: []
      };

      // Resolve related concepts asynchronously
      const relatedIds = data.relatedConceptIds || [];
      const relatedPromises = relatedIds.map((relId: string) => KnowledgeService.getById(relId));
      const relatedResults = await Promise.all(relatedPromises);
      
      newConcept.relatedConcepts = relatedResults
        .filter(Boolean)
        .map((existing: any) => ({ id: existing.id, title: existing.title }));

      await KnowledgeService.addConcept(newConcept);
      navigate(`/knowledge/${newId}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while synthesizing the concept.');
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <h2 className="section-title">Record a New Concept</h2>
      
      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: 'var(--radius-md)', marginTop: '1rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '2rem' }}>
        <input 
          type="text" 
          className="search-input" 
          placeholder="Concept Title (e.g., First Principles)" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: '100%', fontSize: '1.5rem', fontWeight: 600, border: 'none', borderBottom: '1px solid var(--color-border)', borderRadius: 0, padding: '0.5rem 0', backgroundColor: 'transparent' }}
        />
        <textarea 
          placeholder="Distill the essence of this concept. What makes it fundamentally true?" 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{ width: '100%', minHeight: '300px', fontSize: '1.1rem', border: 'none', resize: 'vertical', fontFamily: 'var(--font-sans)', color: 'var(--color-text-secondary)', padding: '1rem 0', backgroundColor: 'transparent' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button 
            onClick={handleCommit}
            disabled={isSubmitting || !title.trim() || !content.trim()}
            style={{ 
              backgroundColor: 'var(--color-accent-terracotta)', 
              color: 'white', 
              border: 'none', 
              padding: '0.8rem 2rem', 
              borderRadius: 'var(--radius-md)', 
              fontSize: '1rem', 
              fontWeight: 500,
              opacity: (isSubmitting || !title.trim() || !content.trim()) ? 0.5 : 1
            }}
          >
            {isSubmitting ? 'Synthesizing...' : 'Commit to Memory'}
          </button>
        </div>
      </div>
    </div>
  );
}
