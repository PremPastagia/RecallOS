import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { KnowledgeService } from '../lib/dataService';
import { ConceptMap } from '../components/ConceptMap';
import type { KnowledgeItem } from '../lib/types';

export function Connections() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [concepts, setConcepts] = useState<KnowledgeItem[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<KnowledgeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const focusId = searchParams.get('focus');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const allItems = await KnowledgeService.getAll();
        setConcepts(allItems);

        if (allItems.length > 0) {
          const targetId = focusId || allItems[0].id;
          const current = await KnowledgeService.getById(targetId);
          setSelectedConcept(current || allItems[0]);
        }
      } catch (err) {
        console.error('Failed to load connections data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [focusId]);

  const handleSelectConcept = async (id: string) => {
    setSearchParams({ focus: id });
    const item = await KnowledgeService.getById(id);
    if (item) {
      setSelectedConcept(item);
    }
  };

  const filteredConcepts = concepts.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div style={{ color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: '3rem' }}>Loading knowledge connections...</div>;
  }

  if (concepts.length === 0) {
    return (
      <div style={{ textAlign: 'center', marginTop: '4rem' }}>
        <h2 style={{ color: 'var(--color-text-obsidian)' }}>No concepts in vault</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>Add concepts to begin mapping connections.</p>
        <Link to="/add" style={{ color: 'var(--color-accent-terracotta)', textDecoration: 'none' }}>+ Add Your First Concept</Link>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--color-text-obsidian)', margin: '0 0 0.5rem 0' }}>
            Connections Explorer
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.95rem' }}>
            Explore the associative links connecting your ideas and mental models.
          </p>
        </div>

        {selectedConcept && (
          <button
            onClick={() => navigate(`/knowledge/${selectedConcept.id}`)}
            style={{
              backgroundColor: 'var(--color-accent-terracotta)',
              color: '#FFFFFF',
              border: 'none',
              padding: '0.6rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Open Full Concept Detail →
          </button>
        )}
      </div>

      <div className="connections-layout">
        {/* Concept Selector Sidebar */}
        <div style={{
          backgroundColor: 'var(--color-card-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          maxHeight: '600px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <input
            type="text"
            placeholder="Filter concepts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.8rem',
              fontSize: '0.9rem',
              backgroundColor: 'var(--color-bg-ivory)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              marginBottom: '1rem',
              outline: 'none'
            }}
          />

          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {filteredConcepts.map(concept => {
              const isSelected = selectedConcept?.id === concept.id;
              const relCount = concept.relatedConcepts?.length || 0;
              return (
                <button
                  key={concept.id}
                  onClick={() => handleSelectConcept(concept.id)}
                  style={{
                    textAlign: 'left',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--color-accent-terracotta)' : 'transparent',
                    backgroundColor: isSelected ? 'rgba(200, 100, 56, 0.08)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontWeight: isSelected ? 600 : 500,
                      color: isSelected ? 'var(--color-accent-terracotta)' : 'var(--color-text-obsidian)',
                      fontSize: '0.92rem'
                    }}>
                      {concept.title}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-text-secondary)',
                      backgroundColor: 'var(--color-border)',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '10px'
                    }}>
                      {relCount}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.8rem',
                    color: 'var(--color-text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {concept.summary}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Focal Map Visualization */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {selectedConcept ? (
            <div>
              <div style={{
                backgroundColor: 'var(--color-card-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h2 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--color-text-obsidian)', fontFamily: 'var(--font-serif)' }}>
                    {selectedConcept.title}
                  </h2>
                  <Link
                    to={`/knowledge/${selectedConcept.id}`}
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--color-accent-terracotta)',
                      textDecoration: 'none',
                      fontWeight: 500
                    }}
                  >
                    Read Concept →
                  </Link>
                </div>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                  {selectedConcept.summary}
                </p>
              </div>

              <ConceptMap
                currentConceptId={selectedConcept.id}
                currentConceptTitle={selectedConcept.title}
                relatedConcepts={selectedConcept.relatedConcepts || []}
                onSelectConcept={handleSelectConcept}
                showExploreLink={false}
              />
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '3rem' }}>
              Select a concept to view its connections map.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
