import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { KnowledgeService } from '../lib/dataService';
import { ConceptMap } from '../components/ConceptMap';
import { ConnectionManager } from '../components/ConnectionManager';
import { useExplorationHistory } from '../lib/useExplorationHistory';
import { ReviewSessionManager } from '../lib/reviewSession';
import type { KnowledgeItem } from '../lib/types';

export function KnowledgeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<KnowledgeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasActiveReviewSession, setHasActiveReviewSession] = useState(false);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editExplanation, setEditExplanation] = useState('');
  const [editExample, setEditExample] = useState('');
  const [editMemoryHook, setEditMemoryHook] = useState('');
  const [editSourceContext, setEditSourceContext] = useState('');
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [regenQualityIssues, setRegenQualityIssues] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    async function loadItem() {
      if (!id) return;
      try {
        setLoading(true);
        const data = await KnowledgeService.getById(id);
        setItem(data || null);
        
        const session = await ReviewSessionManager.getActiveSession();
        setHasActiveReviewSession(!!session);
      } catch (err) {
        console.error('Failed to load knowledge detail', err);
      } finally {
        setLoading(false);
      }
    }
    loadItem();
  }, [id]);

  // Helper to render markdown links like [Concept](/knowledge/id) cleanly
  const renderFormattedContent = (content: string) => {
    if (!content) return null;
    
    // Split by markdown link pattern [text](/knowledge/id)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      const label = match[1];
      const url = match[2];
      parts.push(
        <Link
          key={match.index}
          to={url}
          style={{
            color: 'var(--color-accent-terracotta)',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
            fontWeight: 500
          }}
        >
          {label}
        </Link>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts;
  };

  const parseStructuredContent = (content: string) => {
    if (!content) return { explanation: '', example: '', memoryHook: '', other: '' };
    
    // Split by headings
    const explanationMatch = content.match(/### Explanation([\s\S]*?)(?=### Example|### Memory Hook|$)/i);
    const exampleMatch = content.match(/### Example([\s\S]*?)(?=### Memory Hook|$)/i);
    const hookMatch = content.match(/### Memory Hook([\s\S]*?)(?=$)/i);

    // If none of these headings exist, we just treat the whole thing as "other"
    if (!explanationMatch && !exampleMatch && !hookMatch) {
      // Remove any loose "### " headings just in case
      return { explanation: '', example: '', memoryHook: '', other: content.replace(/###.*?\n/g, '') };
    }

    return {
      explanation: explanationMatch ? explanationMatch[1].trim() : '',
      example: exampleMatch ? exampleMatch[1].trim() : '',
      memoryHook: hookMatch ? hookMatch[1].trim() : '',
      other: ''
    };
  };

  const parsed = item ? parseStructuredContent(item.fullContent) : null;
  const history = useExplorationHistory(item);

  const enterEditMode = () => {
    if (!item || !parsed) return;
    setEditTitle(item.title);
    setEditSummary(item.summary);
    setEditExplanation(parsed.explanation || parsed.other);
    setEditExample(parsed.example);
    setEditMemoryHook(parsed.memoryHook);
    setEditSourceContext(item.sourceContext || '');
    setErrorMsg('');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!item || !id) return;
    setErrorMsg('');
    if (!editTitle.trim() || !editSummary.trim() || !editExplanation.trim()) {
      setErrorMsg('Title, Summary, and Explanation are required.');
      return;
    }

    try {
      setSaving(true);
      
      const duplicate = await KnowledgeService.checkDuplicateTitle(editTitle, id);
      if (duplicate) {
        if (!window.confirm('A concept with this title already exists in your vault. Are you sure you want to save?')) {
          setSaving(false);
          return;
        }
      }

      const fullContent = [
        `### Explanation\n${editExplanation.trim()}`,
        editExample.trim() ? `\n\n### Example\n${editExample.trim()}` : '',
        editMemoryHook.trim() ? `\n\n### Memory Hook\n${editMemoryHook.trim()}` : ''
      ].filter(Boolean).join('');

      let newEmbedding = item.embedding;
      try {
        const embedRes = await fetch('/api/embed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: editTitle, summary: editSummary, fullContent, sourceContext: editSourceContext.trim() || undefined })
        });
        if (embedRes.ok) {
          const data = await embedRes.json();
          if (data.embedding) {
            newEmbedding = data.embedding;
          }
        } else {
          console.warn('Embedding update failed, but continuing save.');
        }
      } catch (e) {
        console.warn('Embedding update network error, but continuing save.', e);
      }

      await KnowledgeService.updateConcept(id, {
        title: editTitle.trim(),
        summary: editSummary.trim(),
        fullContent,
        embedding: newEmbedding,
        sourceContext: editSourceContext.trim() || undefined
      });

      const updated = await KnowledgeService.getById(id);
      setItem(updated || null);
      setIsEditing(false);
    } catch (e: any) {
      setErrorMsg('Failed to save changes.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!item) return;
    try {
      setRegenerating(true);
      setErrorMsg('');
      const currentFullContent = [
        `### Explanation\n${editExplanation.trim()}`,
        editExample.trim() ? `\n\n### Example\n${editExample.trim()}` : '',
        editMemoryHook.trim() ? `\n\n### Memory Hook\n${editMemoryHook.trim()}` : ''
      ].join('');

      const res = await fetch('/api/regenerate-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim() || item.title,
          summary: editSummary.trim() || item.summary,
          fullContent: currentFullContent,
          sourceContext: editSourceContext.trim() || item.sourceContext || undefined
        })
      });

      if (!res.ok) {
        throw new Error('Failed to regenerate');
      }

      const data = await res.json();

      // If quality check requires review — keep edits, show issues inline
      if (data.requiresReview) {
        setRegenQualityIssues(data.qualityIssues || ['Generated content did not meet quality standards.']);
        setRegenerating(false);
        return;
      }

      setRegenQualityIssues([]);
      setEditTitle(data.title);
      setEditSummary(data.summary);
      
      const newParsed = parseStructuredContent(data.fullContent);
      setEditExplanation(newParsed.explanation || newParsed.other);
      setEditExample(newParsed.example);
      setEditMemoryHook(newParsed.memoryHook);
      
    } catch (e) {
      setErrorMsg('Failed to regenerate content.');
      console.error(e);
    } finally {
      setRegenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!item || !id) return;
    setIsDeleting(true);
    try {
      await KnowledgeService.deleteConcept(id);
      navigate('/', { replace: true });
    } catch (e) {
      console.error('Delete failed:', e);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) return <div style={{ color: 'var(--color-text-secondary)', marginTop: '2rem' }}>Loading concept...</div>;
  
  if (!item) return (
    <div style={{ textAlign: 'center', marginTop: '4rem' }}>
      <h2 style={{ color: 'var(--color-text-obsidian)' }}>Concept not found</h2>
      <Link to="/" style={{ color: 'var(--color-accent-terracotta)', textDecoration: 'none' }}>Return to Home</Link>
    </div>
  );
  
  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  const isWeak = item.reviewState && item.reviewState.strength <= 1;

  if (isEditing) {
    return (
      <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ color: 'var(--color-text-obsidian)', marginBottom: '1.5rem', fontWeight: 500 }}>Edit Concept</h2>
        
        {errorMsg && (
          <div style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {errorMsg}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Title</label>
            <input 
              type="text" 
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', fontSize: '1.5rem', fontWeight: 600, border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: 'var(--color-card-bg)', color: 'var(--color-text-obsidian)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Summary</label>
            <textarea 
              value={editSummary}
              onChange={e => setEditSummary(e.target.value)}
              rows={2}
              style={{ width: '100%', padding: '0.75rem', fontSize: '1.1rem', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: 'var(--color-card-bg)', color: 'var(--color-text-obsidian)', resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source / Context (Optional)</label>
            <input 
              type="text" 
              value={editSourceContext}
              onChange={e => setEditSourceContext(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: 'var(--color-card-bg)', color: 'var(--color-text-obsidian)' }}
              placeholder="e.g. From today's supply chain lecture"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Explanation</label>
            <textarea 
              value={editExplanation}
              onChange={e => setEditExplanation(e.target.value)}
              rows={6}
              style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: 'var(--color-card-bg)', color: 'var(--color-text-obsidian)', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Example (Optional)</label>
            <textarea 
              value={editExample}
              onChange={e => setEditExample(e.target.value)}
              rows={4}
              style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: 'var(--color-card-bg)', color: 'var(--color-text-obsidian)', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Memory Hook (Optional)</label>
            <textarea 
              value={editMemoryHook}
              onChange={e => setEditMemoryHook(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: 'var(--color-card-bg)', color: 'var(--color-text-obsidian)', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
          <button 
            onClick={handleRegenerate}
            disabled={regenerating || saving}
            style={{ padding: '0.75rem 1.25rem', backgroundColor: 'transparent', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: (regenerating || saving) ? 'not-allowed' : 'pointer', fontWeight: 500, color: 'var(--color-text-obsidian)' }}
          >
            {regenerating ? 'Regenerating...' : 'Regenerate with Gemini ✨'}
          </button>

          {regenQualityIssues.length > 0 && (
            <div style={{ fontSize: '0.85rem', color: '#92400E', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '4px', padding: '0.5rem 0.75rem', marginLeft: '0.5rem' }}>
              Quality issues: {regenQualityIssues.join(' · ')}
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => setIsEditing(false)}
              disabled={saving || regenerating}
              style={{ padding: '0.75rem 1.25rem', backgroundColor: 'transparent', border: 'none', cursor: (saving || regenerating) ? 'not-allowed' : 'pointer', fontWeight: 500, color: 'var(--color-text-secondary)' }}
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveEdit}
              disabled={saving || regenerating}
              style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--color-accent-terracotta)', color: 'white', border: 'none', borderRadius: '4px', cursor: (saving || regenerating) ? 'not-allowed' : 'pointer', fontWeight: 500 }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        {hasActiveReviewSession ? (
          <Link to="/review" style={{ color: 'var(--color-text)', textDecoration: 'none', display: 'inline-block', fontWeight: 500 }}>
            ← Continue Review
          </Link>
        ) : (
          <Link to="/" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', display: 'inline-block' }}>
            ← Back to Queue
          </Link>
        )}
        
        {history.length > 1 && (
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {history.slice(0, -1).map((h, i) => (
              <React.Fragment key={i}>
                <Link to={`/knowledge/${h.id}`} style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
                  {h.title}
                </Link>
                <span>→</span>
              </React.Fragment>
            ))}
            <span style={{ color: 'var(--color-text-obsidian)', fontWeight: 500 }}>{history[history.length - 1].title}</span>
          </div>
        )}
      </div>
      
      <article>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 600, margin: 0, color: 'var(--color-text-obsidian)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {item.title}
            <button 
              onClick={enterEditMode}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--color-text-secondary)', opacity: 0.6, padding: '0.25rem', display: 'flex', alignItems: 'center' }}
              title="Edit Concept"
            >
              ✎
            </button>
          </h1>

          {/* Unobtrusive delete — only visible on hover via opacity */}
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', opacity: 0.35, fontSize: '0.85rem', padding: '0.25rem 0.5rem', borderRadius: '4px', transition: 'opacity 0.15s', flexShrink: 0, marginTop: '0.5rem' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.35')}
              title="Delete concept"
            >
              Delete
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Permanently delete?</span>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                style={{ background: '#B91C1C', color: 'white', border: 'none', borderRadius: '4px', padding: '0.3rem 0.75rem', fontSize: '0.85rem', fontWeight: 600, cursor: isDeleting ? 'not-allowed' : 'pointer', opacity: isDeleting ? 0.6 : 1 }}
              >
                {isDeleting ? 'Deleting...' : 'Yes, delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.85rem', padding: '0.3rem 0.5rem' }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        
        {isWeak && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'rgba(185, 28, 28, 0.05)', color: '#B91C1C', padding: '0.3rem 0.75rem', borderRadius: '1rem', fontSize: '0.85rem', fontWeight: 500, marginBottom: '1rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#B91C1C' }}></span>
            Needs reinforcement
          </div>
        )}
        
        {/* Core summary (1-line meaning) */}
        <p style={{
          fontSize: '1.25rem',
          color: 'var(--color-text-obsidian)',
          lineHeight: 1.6,
          margin: '0 0 1.5rem 0',
          fontWeight: 500
        }}>
          {item.summary}
        </p>
        
        {item.reviewState && (
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '2.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', opacity: 0.8 }}>
            <span>Last reviewed: {item.reviewState.lastReviewDate ? formatDate(item.reviewState.lastReviewDate) : 'Never'}</span>
            <span>•</span>
            <span>Next review: {formatDate(item.reviewState.nextReviewDate)}</span>
            {item.sourceContext && (
              <>
                <span>•</span>
                <span style={{ fontStyle: 'italic' }}>Learned from: {item.sourceContext}</span>
              </>
            )}
          </div>
        )}

        {/* Short explanation only when needed */}
        {parsed?.explanation && (
          <div style={{ fontSize: '1.1rem', lineHeight: 1.8, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap', marginBottom: '2rem' }}>
            {renderFormattedContent(parsed.explanation)}
          </div>
        )}

        {/* If no structured blocks were found, fallback to original raw display */}
        {parsed?.other && (
          <div style={{ fontSize: '1.1rem', lineHeight: 1.8, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap', marginBottom: '2rem' }}>
            {renderFormattedContent(parsed.other)}
          </div>
        )}

        {/* Test Me Action */}
        <div style={{ margin: '2.5rem 0', display: 'flex', justifyContent: 'center' }}>
          <Link
            to={`/review?conceptId=${item.id}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--color-accent-terracotta)',
              color: '#FFFFFF',
              textDecoration: 'none',
              padding: '0.8rem 1.8rem',
              borderRadius: '2rem',
              fontWeight: 600,
              fontSize: '1.05rem',
              boxShadow: '0 4px 12px rgba(200, 100, 56, 0.2)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(200, 100, 56, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(200, 100, 56, 0.2)';
            }}
          >
            <span>Review this concept</span>
            <span style={{ fontSize: '1.2rem' }}>→</span>
          </Link>
        </div>

        {/* Strong Example Block */}
        {parsed?.example && (
          <div style={{
            backgroundColor: 'var(--color-bg-ivory)',
            borderLeft: '4px solid var(--color-accent-terracotta)',
            padding: '1.5rem',
            borderRadius: '0 8px 8px 0',
            marginBottom: '2rem'
          }}>
            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-accent-terracotta)' }}>
              Example
            </h3>
            <div style={{ fontSize: '1.05rem', lineHeight: 1.7, color: 'var(--color-text-obsidian)' }}>
              {renderFormattedContent(parsed.example)}
            </div>
          </div>
        )}

        {/* Memory Hook Block */}
        {parsed?.memoryHook && (
          <div style={{
            backgroundColor: 'var(--color-card-bg)',
            border: '1px solid var(--color-border)',
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '3rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'flex-start'
          }}>
            <div style={{ fontSize: '1.5rem' }}>🧠</div>
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>
                Memory Hook
              </h3>
              <div style={{ fontSize: '1.05rem', lineHeight: 1.6, color: 'var(--color-text-obsidian)', fontStyle: 'italic' }}>
                {renderFormattedContent(parsed.memoryHook)}
              </div>
            </div>
          </div>
        )}

        {/* Lightweight Visual Relationship Map */}
        <ConceptMap
          currentConceptId={item.id}
          currentConceptTitle={item.title}
          relatedConcepts={item.relatedConcepts || []}
        />

        <ConnectionManager
          currentConceptId={item.id}
          currentConceptTitle={item.title}
          currentConceptSummary={item.summary}
          existingConnections={item.relatedConcepts || []}
          onConnectionAdded={async () => {
            const updated = await KnowledgeService.getById(item.id);
            if (updated) setItem(updated);
          }}
          onConnectionRemoved={async () => {
            const updated = await KnowledgeService.getById(item.id);
            if (updated) setItem(updated);
          }}
        />
      </article>
    </div>
  );
}
