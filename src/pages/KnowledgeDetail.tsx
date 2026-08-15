import { useParams, Link } from 'react-router-dom';
import { KnowledgeService } from '../lib/mockData';

export function KnowledgeDetail() {
  const { id } = useParams<{ id: string }>();
  
  if (!id) return null;
  const concept = KnowledgeService.getById(id);

  if (!concept) {
    return (
      <article style={{ width: '100%', maxWidth: '800px', margin: '0 auto', textAlign: 'center', paddingTop: '4rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Concept Not Found</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
          We couldn't find a record of this in your memory vault.
        </p>
        <Link to="/search" style={{ color: 'var(--color-accent-terracotta)', fontWeight: 500 }}>
          Return to Vault
        </Link>
      </article>
    );
  }

  // Format dates
  const addedDate = new Date(concept.createdAt).toLocaleDateString();
  const strengthPercent = Math.round(concept.reviewState.strength * 100);

  return (
    <article style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link to="/search" style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          ← Back to Vault
        </Link>
      </div>
      
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{concept.title}</h1>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
        <span>Added: {addedDate}</span>
        <span>Strength: {strengthPercent}%</span>
      </div>
      
      <div style={{ fontSize: '1.1rem', lineHeight: '1.8', color: 'var(--color-text-obsidian)' }}>
        <p style={{ marginBottom: '2rem' }}>{concept.fullContent}</p>
        
        {concept.relatedConcepts && concept.relatedConcepts.length > 0 && (
          <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontFamily: 'var(--font-sans)', color: 'var(--color-text-secondary)' }}>
              Connected Concepts
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
              {concept.relatedConcepts.map(related => (
                <Link 
                  key={related.id} 
                  to={`/knowledge/${related.id}`}
                  style={{ 
                    padding: '0.5rem 1rem', 
                    backgroundColor: 'var(--color-card-bg)', 
                    border: '1px solid var(--color-border)', 
                    borderRadius: '2rem',
                    fontSize: '0.9rem'
                  }}
                >
                  {related.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
