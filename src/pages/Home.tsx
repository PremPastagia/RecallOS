import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { KnowledgeService } from '../lib/dataService';
import { ReviewSessionManager, type ReviewSessionData } from '../lib/reviewSession';
import type { KnowledgeItem } from '../lib/types';

export function Home() {
  const [dueItems, setDueItems] = useState<KnowledgeItem[]>([]);
  const [weakItems, setWeakItems] = useState<KnowledgeItem[]>([]);
  const [recentItems, setRecentItems] = useState<KnowledgeItem[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [lastExplored, setLastExplored] = useState<{ id: string; title: string } | null>(null);
  const [activeSession, setActiveSession] = useState<ReviewSessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [due, weak, recent, total, session] = await Promise.all([
          KnowledgeService.getDueForReview(),
          KnowledgeService.getWeakConcepts(),
          KnowledgeService.getRecentlyLearned(),
          KnowledgeService.getTotalCount(),
          ReviewSessionManager.getActiveSession()
        ]);
        setDueItems(due);
        setWeakItems(weak);
        setRecentItems(recent);
        setTotalCount(total);
        setActiveSession(session);

        // Load exploration history to find the most recent
        try {
          const historyRaw = localStorage.getItem('smriti_exploration_history');
          if (historyRaw) {
            const history = JSON.parse(historyRaw);
            if (Array.isArray(history) && history.length > 0) {
              setLastExplored(history[history.length - 1]);
            }
          }
        } catch (e) {
          console.error('Failed to parse history on Home', e);
        }

      } catch (err) {
        console.error('Failed to load home data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', textAlign: 'center', paddingTop: '4rem' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading your vault...</p>
      </div>
    );
  }

  // Empty state for new users
  if (totalCount === 0) {
    return (
      <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', marginTop: '4rem' }}>
          <h2 style={{ margin: '0 0 1rem 0', color: 'var(--color-text)', fontSize: '1.8rem' }}>Welcome to Smriti</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem auto', lineHeight: 1.6 }}>
            Your vault is currently empty. Start by capturing a concept, idea, or mental model you want to remember forever.
          </p>
          <Link to="/add" style={{ 
            display: 'inline-block',
            backgroundColor: 'var(--color-text)', 
            color: 'var(--color-bg)', 
            padding: '1rem 2rem', 
            borderRadius: '2rem', 
            textDecoration: 'none',
            fontWeight: 500,
            fontSize: '1.1rem'
          }}>
            Synthesize New Knowledge
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      
      {/* Top Section: Daily Review & Continue */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', textAlign: 'center' }}>
        {activeSession ? (
          <Link to="/review" style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            backgroundColor: 'var(--color-text)', 
            color: 'var(--color-bg)', 
            padding: '1.2rem 2.5rem', 
            borderRadius: '3rem', 
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '1.2rem',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            width: '100%',
            maxWidth: '400px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
          }}>
            <span>Continue today's review ({activeSession.questions.length - activeSession.currentIndex} remaining)</span>
            <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>→</span>
          </Link>
        ) : dueItems.length > 0 ? (
          <Link to="/review" style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            backgroundColor: 'var(--color-accent-terracotta)', 
            color: '#FFFFFF', 
            padding: '1.2rem 2.5rem', 
            borderRadius: '3rem', 
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '1.2rem',
            boxShadow: '0 4px 12px rgba(200, 100, 56, 0.2)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            width: '100%',
            maxWidth: '400px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(200, 100, 56, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(200, 100, 56, 0.2)';
          }}>
            <span>Start today's review ({dueItems.length} due)</span>
            <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>→</span>
          </Link>
        ) : (
          <div style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', backgroundColor: 'rgba(77, 124, 15, 0.05)', border: '1px solid rgba(77, 124, 15, 0.2)', width: '100%', maxWidth: '400px' }}>
            <p style={{ margin: 0, color: '#4D7C0F', fontWeight: 500 }}>All caught up for today.</p>
          </div>
        )}

        {lastExplored && (
          <Link to={`/knowledge/${lastExplored.id}`} style={{
            display: 'inline-block',
            padding: '0.8rem 1.5rem',
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
            fontSize: '0.95rem',
            borderRadius: '2rem',
            transition: 'background-color 0.2s, color 0.2s',
            marginTop: '0.5rem'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-border)';
            e.currentTarget.style.color = 'var(--color-text)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
          }}>
            Continue exploring: <strong>{lastExplored.title}</strong>
          </Link>
        )}
      </div>

      {/* Needs Attention Section (Only shows if there are weak items) */}
      {weakItems.length > 0 && (
        <section>
          <h3 style={{ fontSize: '1.1rem', color: '#B91C1C', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#B91C1C', display: 'inline-block' }}></span>
            Needs Attention
          </h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {weakItems.map(item => (
              <Link key={item.id} to={`/knowledge/${item.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ 
                  padding: '1rem', 
                  backgroundColor: 'var(--color-bg)', 
                  border: '1px solid var(--color-border)', 
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'border-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#B91C1C'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                >
                  <span style={{ fontWeight: 500, color: 'var(--color-text)' }}>{item.title}</span>
                  <span style={{ fontSize: '0.85rem', color: '#B91C1C' }}>Fading memory</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recently Learned Section */}
      {recentItems.length > 0 && (
        <section>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)', margin: '0 0 1rem 0' }}>
            Recently Learned
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {recentItems.map(item => {
              const isNew = (Date.now() - new Date(item.createdAt).getTime()) <= 3 * 24 * 60 * 60 * 1000;
              return (
                <Link key={item.id} to={`/knowledge/${item.id}`} style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ height: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text)' }}>
                        {item.title}
                      </h4>
                      {isNew && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-accent-terracotta)', backgroundColor: 'rgba(200, 100, 56, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '1rem', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>
                          NEW
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.summary}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
}
