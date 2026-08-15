import React, { useState, useId } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { RelatedConcept } from '../lib/types';

interface ConceptMapProps {
  currentConceptId: string;
  currentConceptTitle: string;
  relatedConcepts: RelatedConcept[];
  onSelectConcept?: (id: string) => void;
  showExploreLink?: boolean;
}

export const ConceptMap: React.FC<ConceptMapProps> = ({
  currentConceptId,
  currentConceptTitle,
  relatedConcepts = [],
  onSelectConcept,
  showExploreLink = true
}) => {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const filterId = useId();

  // Filter out any invalid/empty concept entries
  const validRelated = relatedConcepts.filter(
    (c): c is RelatedConcept => Boolean(c && c.id && c.title && c.id !== currentConceptId)
  );

  const handleNodeClick = (id: string) => {
    if (onSelectConcept) {
      onSelectConcept(id);
    } else {
      navigate(`/knowledge/${id}`);
    }
  };

  const hoveredConcept = validRelated.find(c => c.id === hoveredId);

  // SVG Geometry Settings
  const width = 580;
  const height = 300;
  const cx = width / 2;
  const cy = height / 2;
  
  // Adaptive radius based on node count
  const count = validRelated.length;
  const radius = count <= 2 ? 125 : count <= 4 ? 130 : 135;

  // Calculate coordinates for orbiting nodes
  const nodesWithPositions = validRelated.map((concept, index) => {
    // Start at top (-PI/2) and distribute evenly
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / count;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    return {
      ...concept,
      x,
      y,
      angle
    };
  });

  const truncateText = (text: string, maxLen: number) => {
    if (!text) return '';
    return text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text;
  };

  return (
    <div className="concept-map-container" style={{
      marginTop: '3rem',
      paddingTop: '2rem',
      borderTop: '1px solid var(--color-border)',
      position: 'relative'
    }}>
      {/* Section Header */}
      <div className="concept-map-header" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 500,
            margin: 0,
            color: 'var(--color-text-obsidian)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>Connected Concepts</span>
            <span style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              backgroundColor: validRelated.length > 0 ? 'rgba(200, 100, 56, 0.1)' : 'var(--color-border)',
              color: validRelated.length > 0 ? 'var(--color-accent-terracotta)' : 'var(--color-text-secondary)',
              padding: '0.15rem 0.6rem',
              borderRadius: '12px',
              fontFamily: 'var(--font-sans)'
            }}>
              {validRelated.length}
            </span>
          </h3>
        </div>

        <div className="concept-map-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {showExploreLink && (
            <Link
              to={`/connections?focus=${currentConceptId}`}
              style={{
                fontSize: '0.85rem',
                color: 'var(--color-accent-terracotta)',
                marginRight: '0.75rem',
                fontWeight: 500
              }}
            >
              Vault Network →
            </Link>
          )}

          {/* View Toggle */}
          <div style={{
            display: 'inline-flex',
            backgroundColor: '#EDEAE4',
            borderRadius: '8px',
            padding: '2px'
          }}>
            <button
              onClick={() => setViewMode('map')}
              type="button"
              aria-label="Map view"
              style={{
                background: viewMode === 'map' ? 'var(--color-card-bg)' : 'transparent',
                color: viewMode === 'map' ? 'var(--color-text-obsidian)' : 'var(--color-text-secondary)',
                border: 'none',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 500,
                boxShadow: viewMode === 'map' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              ✦ Map View
            </button>
            <button
              onClick={() => setViewMode('list')}
              type="button"
              aria-label="List view"
              style={{
                background: viewMode === 'list' ? 'var(--color-card-bg)' : 'transparent',
                color: viewMode === 'list' ? 'var(--color-text-obsidian)' : 'var(--color-text-secondary)',
                border: 'none',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 500,
                boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              ☰ List View
            </button>
          </div>
        </div>
      </div>

      {/* Map View */}
      {viewMode === 'map' ? (
        <div style={{
          backgroundColor: 'var(--color-card-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
          overflow: 'hidden'
        }}>
          {validRelated.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem 1.5rem',
              color: 'var(--color-text-secondary)'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(200, 100, 56, 0.08)',
                color: 'var(--color-accent-terracotta)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto',
                fontSize: '1.25rem'
              }}>
                ◎
              </div>
              <p style={{ fontWeight: 500, color: 'var(--color-text-obsidian)', marginBottom: '0.4rem' }}>
                No direct connections recorded yet
              </p>
              <p style={{ fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
                As you synthesize new knowledge, Smriti links related ideas to form your associative memory web.
              </p>
              <Link
                to="/add"
                style={{
                  display: 'inline-block',
                  fontSize: '0.85rem',
                  padding: '0.5rem 1.2rem',
                  backgroundColor: 'var(--color-text-obsidian)',
                  color: 'var(--color-bg-ivory)',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 500
                }}
              >
                Synthesize Related Knowledge
              </Link>
            </div>
          ) : (
            <>
              {/* Interactive Radial Graph SVG */}
              <div style={{ width: '100%', overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  style={{
                    width: '100%',
                    maxWidth: '680px',
                    height: 'auto',
                    userSelect: 'none',
                    display: 'block'
                  }}
                  role="img"
                  aria-label={`Visual connection map centered on ${currentConceptTitle} with ${validRelated.length} related concepts`}
                >
                  <defs>
                    {/* Soft node shadow */}
                    <filter id={`node-shadow-${filterId}`} x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.06" />
                    </filter>
                    <filter id={`node-hover-shadow-${filterId}`} x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#C86438" floodOpacity="0.18" />
                    </filter>
                  </defs>

                  {/* Orbital Guide Ring */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill="none"
                    stroke="var(--color-border)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    opacity="0.8"
                  />

                  {/* Connecting Lines */}
                  {nodesWithPositions.map(node => {
                    const isHovered = hoveredId === node.id;
                    return (
                      <g key={`edge-${node.id}`}>
                        <line
                          x1={cx}
                          y1={cy}
                          x2={node.x}
                          y2={node.y}
                          stroke={isHovered ? 'var(--color-accent-terracotta)' : 'var(--color-border)'}
                          strokeWidth={isHovered ? 2.5 : 1.5}
                          strokeDasharray={isHovered ? 'none' : '3 3'}
                          style={{ transition: 'all 0.2s ease' }}
                        />
                        {/* Midpoint decorative pulse dot */}
                        <circle
                          cx={(cx + node.x) / 2}
                          cy={(cy + node.y) / 2}
                          r={isHovered ? 3.5 : 2}
                          fill={isHovered ? 'var(--color-accent-terracotta)' : '#C2BEB7'}
                          style={{ transition: 'all 0.2s ease' }}
                        />
                      </g>
                    );
                  })}

                  {/* Center (Focal) Node */}
                  <g className="focal-node" style={{ cursor: 'default' }}>
                    {/* Focal Aura */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r="46"
                      fill="none"
                      stroke="var(--color-accent-terracotta)"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                      opacity="0.4"
                    />
                    
                    {/* Main Focal Card */}
                    <rect
                      x={cx - 80}
                      y={cy - 28}
                      width={160}
                      height={56}
                      rx={12}
                      fill="var(--color-text-obsidian)"
                      stroke="var(--color-accent-terracotta)"
                      strokeWidth={2}
                      filter={`url(#node-shadow-${filterId})`}
                    />
                    
                    {/* Subtitle tag */}
                    <text
                      x={cx}
                      y={cy - 10}
                      textAnchor="middle"
                      fill="var(--color-accent-terracotta)"
                      fontSize="9.5"
                      fontWeight="600"
                      letterSpacing="0.08em"
                      fontFamily="var(--font-sans)"
                    >
                      CURRENT CONCEPT
                    </text>

                    {/* Center Title */}
                    <text
                      x={cx}
                      y={cy + 12}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="12.5"
                      fontWeight="600"
                      fontFamily="var(--font-serif)"
                    >
                      {truncateText(currentConceptTitle, 18)}
                    </text>
                  </g>

                  {/* Orbiting Related Nodes */}
                  {nodesWithPositions.map(node => {
                    const isHovered = hoveredId === node.id;
                    const pillWidth = 145;
                    const pillHeight = 46;
                    const rectX = node.x - pillWidth / 2;
                    const rectY = node.y - pillHeight / 2;

                    return (
                      <g
                        key={`node-${node.id}`}
                        className="related-node"
                        onMouseEnter={() => setHoveredId(node.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onTouchStart={() => setHoveredId(node.id)}
                        onFocus={() => setHoveredId(node.id)}
                        onBlur={() => setHoveredId(null)}
                        onClick={() => handleNodeClick(node.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleNodeClick(node.id);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Explore related concept: ${node.title}`}
                        style={{
                          cursor: 'pointer',
                          outline: 'none',
                          transform: isHovered ? `translate(0, -2px)` : 'none',
                          transition: 'transform 0.15s ease'
                        }}
                      >
                        <title>{node.title}{node.summary ? ` — ${node.summary}` : ''}</title>

                        {/* Node Pill Background */}
                        <rect
                          x={rectX}
                          y={rectY}
                          width={pillWidth}
                          height={pillHeight}
                          rx={10}
                          fill={isHovered ? '#FFFFFF' : 'var(--color-bg-ivory)'}
                          stroke={isHovered ? 'var(--color-accent-terracotta)' : 'var(--color-border)'}
                          strokeWidth={isHovered ? 2 : 1}
                          filter={isHovered ? `url(#node-hover-shadow-${filterId})` : `url(#node-shadow-${filterId})`}
                          style={{ transition: 'all 0.15s ease' }}
                        />

                        {/* Indicator Dot */}
                        <circle
                          cx={rectX + 16}
                          cy={node.y}
                          r={isHovered ? 4.5 : 3.5}
                          fill={isHovered ? 'var(--color-accent-terracotta)' : '#88847E'}
                          style={{ transition: 'all 0.15s ease' }}
                        />

                        {/* Node Title */}
                        <text
                          x={rectX + 28}
                          y={node.y + 4}
                          textAnchor="start"
                          fill={isHovered ? 'var(--color-accent-terracotta)' : 'var(--color-text-obsidian)'}
                          fontSize="12"
                          fontWeight={isHovered ? '600' : '500'}
                          fontFamily="var(--font-sans)"
                          style={{ transition: 'fill 0.15s ease' }}
                        >
                          {truncateText(node.title, 14)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Node Inspection / Preview Pill Bar */}
              <div style={{
                marginTop: '0.75rem',
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--color-bg-ivory)',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.85rem',
                minHeight: '44px',
                transition: 'all 0.2s ease'
              }}>
                {hoveredConcept ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '1rem' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <strong style={{ color: 'var(--color-accent-terracotta)', marginRight: '0.5rem' }}>
                        🔗 {hoveredConcept.title}:
                      </strong>
                      <span style={{ color: 'var(--color-text-secondary)' }}>
                        {hoveredConcept.summary || 'Click to open knowledge details.'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleNodeClick(hoveredConcept.id)}
                      style={{
                        backgroundColor: 'var(--color-accent-terracotta)',
                        color: 'white',
                        border: 'none',
                        padding: '0.3rem 0.8rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                      }}
                    >
                      Open Concept →
                    </button>
                  </div>
                ) : (
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem', width: '100%', textAlign: 'center' }}>
                    Hover or tap any connected concept node to preview and navigate.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        /* List View (Concise Fallback / Accessible View) */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {validRelated.length === 0 ? (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
              No related concepts linked yet.
            </p>
          ) : (
            validRelated.map(related => (
              <div
                key={related.id}
                onClick={() => handleNodeClick(related.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleNodeClick(related.id);
                  }
                }}
                style={{
                  backgroundColor: 'var(--color-card-bg)',
                  border: '1px solid var(--color-border)',
                  padding: '1.1rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-accent-terracotta)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.04)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <h4 style={{
                      margin: 0,
                      fontSize: '1.05rem',
                      fontWeight: 600,
                      color: 'var(--color-text-obsidian)',
                      fontFamily: 'var(--font-sans)'
                    }}>
                      {related.title}
                    </h4>
                    <span style={{ color: 'var(--color-accent-terracotta)', fontSize: '0.9rem' }}>→</span>
                  </div>
                  {related.summary && (
                    <p style={{
                      margin: 0,
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.85rem',
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {related.summary}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
