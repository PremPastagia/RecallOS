import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KnowledgeService } from '../lib/dataService';
import { useSpeechRecognition } from '../lib/useSpeechRecognition';
import type { KnowledgeItem } from '../lib/types';

export function AddConcept() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const { state: speechState, transcript, errorMsg: speechError, toggleListening, isSupported, resetTranscript } = useSpeechRecognition();

  // When speech session ends, append to content
  useEffect(() => {
    if (speechState === 'idle' && transcript) {
      setContent(prev => (prev + ' ' + transcript).trim());
      resetTranscript();
    }
  }, [speechState, transcript, resetTranscript]);

  const handleCommit = async () => {
    if (!title.trim() || (!content.trim() && !transcript.trim())) return;
    
    setIsSubmitting(true);
    setError(null);
    
    // In case they click submit while still recording, grab everything
    const finalContent = (content + ' ' + transcript).trim();
    
    try {
      // Get a list of existing concepts
      const allConcepts = await KnowledgeService.getAll();
      
      // 1. Semantic search for duplicates FIRST
      const searchRes = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: title + ' ' + finalContent, concepts: allConcepts })
      });
      
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        // If we find a very strong match (> 0.85), treat as duplicate
        if (searchData.length > 0 && searchData[0].similarity > 0.85) {
          navigate(`/knowledge/${searchData[0].id}`);
          return;
        }
      }

      // 2. Generate new concept with Gemini
      const existingConcepts = allConcepts.map((c: KnowledgeItem) => ({
        id: c.id,
        title: c.title,
        summary: c.summary
      }));

      const response = await fetch('/api/generate-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: finalContent, existingConcepts })
      });

      if (!response.ok) {
        throw new Error('Failed to generate concept from server');
      }

      const data = await response.json();

      if (data.isDuplicate && data.duplicateOfId) {
        // Fallback LLM duplicate detection
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
      
      {(error || speechError) && (
        <div style={{ padding: '1rem', backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: 'var(--radius-md)', marginTop: '1rem' }}>
          {error || speechError}
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
        
        <div style={{ position: 'relative' }}>
          <textarea 
            placeholder="Distill the essence of this concept. What makes it fundamentally true? You can type or speak." 
            value={speechState === 'listening' ? content + (content && transcript ? ' ' : '') + transcript : content}
            onChange={(e) => {
              if (speechState !== 'listening') {
                setContent(e.target.value);
              }
            }}
            readOnly={speechState === 'listening'}
            style={{ 
              width: '100%', 
              minHeight: '300px', 
              fontSize: '1.1rem', 
              border: 'none', 
              resize: 'vertical', 
              fontFamily: 'var(--font-sans)', 
              color: speechState === 'listening' ? 'var(--color-text)' : 'var(--color-text-secondary)', 
              padding: '1rem 0', 
              backgroundColor: 'transparent' 
            }}
          />
          
          {/* Minimal Voice Status / Button */}
          {isSupported && (
            <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {speechState === 'listening' && (
                <span style={{ fontSize: '0.8rem', color: 'var(--color-accent-terracotta)', fontWeight: 500, animation: 'pulse 2s infinite' }}>Listening...</span>
              )}
              {speechState === 'transcribing' && (
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Processing...</span>
              )}
              <button
                onClick={toggleListening}
                style={{
                  background: speechState === 'listening' ? '#FEE2E2' : 'var(--color-bg)',
                  color: speechState === 'listening' ? 'var(--color-accent-terracotta)' : 'var(--color-text-secondary)',
                  border: '1px solid',
                  borderColor: speechState === 'listening' ? '#FCA5A5' : 'var(--color-border)',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '1.2rem'
                }}
                title={speechState === 'listening' ? 'Stop Recording' : 'Start Recording'}
              >
                {/* SVG Mic Icon */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button 
            onClick={handleCommit}
            disabled={isSubmitting || !title.trim() || (!content.trim() && !transcript.trim())}
            style={{ 
              backgroundColor: 'var(--color-accent-terracotta)', 
              color: 'white', 
              border: 'none', 
              padding: '0.8rem 2rem', 
              borderRadius: 'var(--radius-md)', 
              fontSize: '1rem', 
              fontWeight: 500,
              opacity: (isSubmitting || !title.trim() || (!content.trim() && !transcript.trim())) ? 0.5 : 1
            }}
          >
            {isSubmitting ? 'Synthesizing...' : 'Commit to Memory'}
          </button>
        </div>
      </div>
    </div>
  );
}
