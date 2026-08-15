import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { KnowledgeService } from '../lib/dataService';
import type { KnowledgeItem } from '../lib/types';

export function Home() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await KnowledgeService.getDueForReview();
        setItems(data);
      } catch (err) {
        console.error('Failed to load due items', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <h2 className="section-title">Daily Recall</h2>
      
      {loading ? (
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading your memory queue...</p>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', marginTop: '2rem' }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.2rem', marginBottom: '1.5rem' }}>
            Your memory queue is empty for today.
          </p>
          <Link to="/add" style={{ 
            display: 'inline-block',
            backgroundColor: 'var(--color-text)', 
            color: 'var(--color-bg)', 
            padding: '0.8rem 1.5rem', 
            borderRadius: 'var(--radius-md)', 
            textDecoration: 'none',
            fontWeight: 500
          }}>
            Synthesize New Knowledge
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem', marginTop: '2rem' }}>
          {items.map(item => (
            <Link key={item.id} to={`/knowledge/${item.id}`} style={{ textDecoration: 'none' }}>
              <div className="card">
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: 'var(--color-text)' }}>
                  {item.title}
                </h3>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {item.summary}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
