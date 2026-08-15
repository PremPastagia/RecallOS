import { Link } from 'react-router-dom';
import { KnowledgeService } from '../lib/mockData';

export function Home() {
  const queue = KnowledgeService.getDueForReview();
  const recent = KnowledgeService.getAll().slice(0, 3);

  return (
    <>
      {/* Search / Input */}
      <div className="search-container">
        <input 
          type="text" 
          className="search-input" 
          placeholder="What would you like to recall or reflect upon today?" 
        />
      </div>

      {/* Daily Memory Recall Queue */}
      <section className="queue-section">
        <h2 className="section-title">Daily Memory Recall Queue</h2>
        
        {queue.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>You have no concepts due for review today.</p>
        ) : (
          <div className="queue-grid">
            {queue.map((concept) => (
              <Link to={`/knowledge/${concept.id}`} key={concept.id} className="concept-card">
                <h3 className="concept-title">{concept.title}</h3>
                <p className="concept-summary">{concept.summary}</p>
                <div className="memory-indicator">
                  <span>Memory strength</span>
                  <div className="ring-icon" style={{ opacity: Math.max(0.3, concept.reviewState.strength) }}></div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent Intellectual Explorations */}
      <section className="queue-section" style={{ marginTop: '2rem' }}>
        <h2 className="section-title">Recent Intellectual Explorations</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {recent.map((concept) => (
            <p key={concept.id}>
              <Link to={`/knowledge/${concept.id}`} style={{ fontWeight: 600 }}>
                {concept.title}
              </Link>
              {' - '}{concept.summary}
            </p>
          ))}
        </div>
      </section>
    </>
  );
}
