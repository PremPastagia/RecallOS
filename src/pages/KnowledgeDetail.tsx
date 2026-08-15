
import { useParams, Link } from 'react-router-dom';

export function KnowledgeDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <article style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link to="/search" style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          ← Back to Vault
        </Link>
      </div>
      
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Concept ID: {id}</h1>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
        <span>Added: Today</span>
        <span>Strength: 85%</span>
      </div>
      
      <div style={{ fontSize: '1.1rem', lineHeight: '1.8', color: 'var(--color-text-obsidian)' }}>
        <p style={{ marginBottom: '1.5rem' }}>
          This is a placeholder for the deep knowledge detail view. In the future, this page will display the full synthesis, connected nodes, and historical retention metrics for this specific concept.
        </p>
        <p style={{ padding: '1.5rem', backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          "The greatest enemy of knowledge is not ignorance, it is the illusion of knowledge."
        </p>
      </div>
    </article>
  );
}
