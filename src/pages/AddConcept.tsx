import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function AddConcept() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleCommit = () => {
    if (!title.trim() || !content.trim()) return;
    
    setIsSubmitting(true);
    
    // Simulate network delay and persistence
    setTimeout(() => {
      setIsSubmitting(false);
      // In a real app, we'd navigate to the newly created concept's detail page.
      // For now, just go back to home.
      navigate('/');
    }, 800);
  };

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <h2 className="section-title">Record a New Concept</h2>
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
            {isSubmitting ? 'Committing...' : 'Commit to Memory'}
          </button>
        </div>
      </div>
    </div>
  );
}
