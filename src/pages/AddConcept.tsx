import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { KnowledgeService } from '../lib/dataService';
import { useSpeechRecognition } from '../lib/useSpeechRecognition';
import type { KnowledgeItem } from '../lib/types';

export function AddConcept() {
  const [mode, setMode] = useState<'quick' | 'paste'>('quick');

  // Quick mode states
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateMatch, setDuplicateMatch] = useState<KnowledgeItem | null>(null);
  const [topContextConcepts, setTopContextConcepts] = useState<any[]>([]);
  const [isCaptured, setIsCaptured] = useState(false);
  const [newConceptId, setNewConceptId] = useState<string | null>(null);
  const [newConceptTitle, setNewConceptTitle] = useState<string | null>(null);
  const [sourceContext, setSourceContext] = useState('');

  // Paste notes mode states
  const PASTE_MAX_CHARS = 15000;
  const [pasteContent, setPasteContent] = useState('');
  const [pasteSourceContext, setPasteSourceContext] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedConcepts, setExtractedConcepts] = useState<Array<{ title: string, summary: string, selected: boolean, status?: 'pending' | 'success' | 'duplicate' | 'error' }>>([]);
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [batchProgress, setBatchProgress] = useState('');
  const [batchComplete, setBatchComplete] = useState(false);
  const [batchSuccessCount, setBatchSuccessCount] = useState(0);

  const { state: speechState, transcript, errorMsg: speechError, toggleListening, isSupported, resetTranscript } = useSpeechRecognition();

  // When speech session ends, append to content
  useEffect(() => {
    if (speechState === 'idle' && transcript && mode === 'quick') {
      setContent(prev => (prev + ' ' + transcript).trim());
      resetTranscript();
    }
  }, [speechState, transcript, resetTranscript, mode]);

  const handleInitialCommit = async () => {
    const rawInput = (content + ' ' + (speechState === 'listening' ? transcript : '')).trim();
    if (!rawInput) return;
    
    setIsSubmitting(true);
    setError(null);
    setDuplicateMatch(null);

    try {
      const allConcepts = await KnowledgeService.getAll();
      
      const searchRes = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: rawInput, concepts: allConcepts })
      });
      
      let contextConcepts: any[] = [];
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        contextConcepts = searchData.slice(0, 10).map((c: any) => ({
          id: c.id,
          title: c.title,
          summary: c.summary
        }));
        
        setTopContextConcepts(contextConcepts);
        
        // Check for strong match (semantic or exact)
        if (searchData.length > 0 && searchData[0].similarity > 0.82) {
          setDuplicateMatch(searchData[0]);
          setIsSubmitting(false);
          return;
        }
      }

      await proceedWithGeneration(rawInput, contextConcepts);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred checking for duplicates.');
      setIsSubmitting(false);
    }
  };

  const proceedWithGeneration = async (rawInput: string, existingContext?: any[]) => {
    setIsSubmitting(true);
    setError(null);
    setDuplicateMatch(null);

    const contextToUse = existingContext || topContextConcepts;

    try {
      const payloadSourceContext = speechState === 'listening' ? 'Captured via voice' : sourceContext;
      const response = await fetch('/api/generate-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput, topRelevantConcepts: contextToUse, sourceContext: payloadSourceContext })
      });

      if (!response.ok) {
        throw new Error('Failed to generate concept from server');
      }

      const data = await response.json();

      const newId = `k_${Date.now()}`;
      const newConcept: KnowledgeItem = {
        id: newId,
        title: data.title || 'Untitled Concept',
        summary: data.summary || '',
        fullContent: data.fullContent || '',
        createdAt: new Date().toISOString(),
        reviewState: {
          nextReviewDate: new Date().toISOString(),
          strength: 0,
          interval: 1,
          easeFactor: 2.5
        },
        relatedConcepts: [],
        embedding: data.embedding,
        sourceContext: payloadSourceContext || undefined
      };

      const relatedIds = data.relatedConceptIds || [];
      if (relatedIds.length > 0) {
        const relatedPromises = relatedIds.map((relId: string) => KnowledgeService.getById(relId));
        const relatedResults = await Promise.all(relatedPromises);
        newConcept.relatedConcepts = relatedResults
          .filter(Boolean)
          .map((existing: any) => ({ id: existing.id, title: existing.title }));
      }

      await KnowledgeService.addConcept(newConcept);
      
      setNewConceptId(newId);
      setNewConceptTitle(newConcept.title);
      setIsCaptured(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while synthesizing the concept.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExtractConcepts = async () => {
    if (!pasteContent.trim()) return;
    setIsExtracting(true);
    setError(null);
    setExtractedConcepts([]);
    setBatchComplete(false);
    setBatchSuccessCount(0);

    try {
      const response = await fetch('/api/extract-concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pasteContent })
      });

      if (!response.ok) {
        throw new Error('Failed to extract concepts from text.');
      }

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No distinct concepts were found in the text.');
      }

      setExtractedConcepts(data.map((c: any) => ({ ...c, selected: true, status: 'pending' })));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during extraction.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleBatchIngest = async () => {
    const selected = extractedConcepts.filter(c => c.selected && c.status === 'pending');
    if (selected.length === 0) return;

    setIsBatchSaving(true);
    setError(null);
    let successCount = 0;
    
    try {
      const allConcepts = await KnowledgeService.getAll();

      for (let i = 0; i < selected.length; i++) {
        const target = selected[i];
        setBatchProgress(`Saving concept ${i + 1} of ${selected.length}: ${target.title}...`);
        
        try {
          const rawInput = `${target.title}\n${target.summary}`;
          
          // Semantic check
          const searchRes = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: rawInput, concepts: allConcepts })
          });

          let contextConcepts: any[] = [];
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            contextConcepts = searchData.slice(0, 10).map((c: any) => ({
              id: c.id,
              title: c.title,
              summary: c.summary
            }));
            
            if (searchData.length > 0 && searchData[0].similarity > 0.82) {
              setExtractedConcepts(prev => prev.map(c => c.title === target.title ? { ...c, status: 'duplicate' } : c));
              continue; // skip duplicate
            }
          }

          // Generate
          const genRes = await fetch('/api/generate-concept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rawInput, topRelevantConcepts: contextConcepts, sourceContext: pasteSourceContext || 'Extracted from pasted notes' })
          });

          if (!genRes.ok) throw new Error('Generation failed');
          const data = await genRes.json();

          const newConcept: KnowledgeItem = {
            id: `k_${Date.now()}_${i}`,
            title: data.title || target.title,
            summary: data.summary || target.summary,
            fullContent: data.fullContent || '',
            createdAt: new Date().toISOString(),
            reviewState: { nextReviewDate: new Date().toISOString(), strength: 0, interval: 1, easeFactor: 2.5 },
            relatedConcepts: [],
            embedding: data.embedding,
            sourceContext: pasteSourceContext || 'Extracted from pasted notes'
          };

          const relatedIds = data.relatedConceptIds || [];
          if (relatedIds.length > 0) {
            const relatedPromises = relatedIds.map((relId: string) => KnowledgeService.getById(relId));
            const relatedResults = await Promise.all(relatedPromises);
            newConcept.relatedConcepts = relatedResults.filter(Boolean).map((existing: any) => ({ id: existing.id, title: existing.title }));
          }

          await KnowledgeService.addConcept(newConcept);
          successCount++;
          
          setExtractedConcepts(prev => prev.map(c => c.title === target.title ? { ...c, status: 'success' } : c));
        } catch (innerErr) {
          console.error(`Error saving ${target.title}:`, innerErr);
          setExtractedConcepts(prev => prev.map(c => c.title === target.title ? { ...c, status: 'error' } : c));
        }
      }
      
      setBatchComplete(true);
      setBatchSuccessCount(successCount);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during batch ingestion.');
    } finally {
      setIsBatchSaving(false);
      setBatchProgress('');
    }
  };

  const handleCaptureAnother = () => {
    setContent('');
    resetTranscript();
    setIsCaptured(false);
    setNewConceptId(null);
    setNewConceptTitle(null);
    setSourceContext('');
  };

  const handleResetPaste = () => {
    setPasteContent('');
    setPasteSourceContext('');
    setExtractedConcepts([]);
    setBatchComplete(false);
    setBatchSuccessCount(0);
    setError(null);
  };

  if (isCaptured && newConceptId) {
    return (
      <div style={{ width: '100%', maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#ECFCCB', color: '#4D7C0F', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h2 style={{ color: 'var(--color-text)', marginBottom: '0.5rem' }}>Memory Captured</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem', fontSize: '1.1rem' }}>
          <strong>{newConceptTitle}</strong> has been synthesized and securely stored in your vault.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button 
            onClick={handleCaptureAnother}
            style={{ 
              backgroundColor: 'var(--color-bg)', 
              color: 'var(--color-text)', 
              border: '1px solid var(--color-border)', 
              padding: '0.8rem 1.5rem', 
              borderRadius: 'var(--radius-md)', 
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Capture Another
          </button>
          <Link 
            to={`/knowledge/${newConceptId}`}
            style={{ 
              backgroundColor: 'var(--color-accent-terracotta)', 
              color: 'white', 
              border: 'none', 
              padding: '0.8rem 1.5rem', 
              borderRadius: 'var(--radius-md)', 
              fontWeight: 500,
              textDecoration: 'none'
            }}
          >
            View Concept
          </Link>
        </div>
      </div>
    );
  }

  if (batchComplete) {
    return (
      <div style={{ width: '100%', maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#ECFCCB', color: '#4D7C0F', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h2 style={{ color: 'var(--color-text)', marginBottom: '0.5rem' }}>Batch Captured</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem', fontSize: '1.1rem' }}>
          Successfully saved <strong>{batchSuccessCount}</strong> distinct concepts to your vault.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button 
            onClick={handleResetPaste}
            style={{ 
              backgroundColor: 'var(--color-bg)', 
              color: 'var(--color-text)', 
              border: '1px solid var(--color-border)', 
              padding: '0.8rem 1.5rem', 
              borderRadius: 'var(--radius-md)', 
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Paste More Notes
          </button>
          <Link 
            to={`/`}
            style={{ 
              backgroundColor: 'var(--color-accent-terracotta)', 
              color: 'white', 
              border: 'none', 
              padding: '0.8rem 1.5rem', 
              borderRadius: 'var(--radius-md)', 
              fontWeight: 500,
              textDecoration: 'none'
            }}
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>Record a Memory</h2>
        
        <div style={{ display: 'flex', backgroundColor: 'var(--color-border)', padding: '0.25rem', borderRadius: '2rem' }}>
          <button
            onClick={() => setMode('quick')}
            style={{
              background: mode === 'quick' ? 'var(--color-bg)' : 'transparent',
              color: mode === 'quick' ? 'var(--color-text-obsidian)' : 'var(--color-text-secondary)',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '2rem',
              fontWeight: mode === 'quick' ? 600 : 500,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: mode === 'quick' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Quick Concept
          </button>
          <button
            onClick={() => {
              setMode('paste');
              if (speechState === 'listening') toggleListening();
            }}
            style={{
              background: mode === 'paste' ? 'var(--color-bg)' : 'transparent',
              color: mode === 'paste' ? 'var(--color-text-obsidian)' : 'var(--color-text-secondary)',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '2rem',
              fontWeight: mode === 'paste' ? 600 : 500,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: mode === 'paste' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Paste Notes
          </button>
        </div>
      </div>
      
      {(error || speechError) && (
        <div style={{ padding: '1rem', backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
          {error || speechError}
        </div>
      )}

      {mode === 'quick' ? (
        <>
          {duplicateMatch && (
            <div style={{ marginBottom: '1.5rem', padding: '1.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-ivory)', animation: 'fadeIn 0.3s ease' }}>
              <h3 style={{ color: 'var(--color-accent-terracotta)', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                Already in your memory?
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
                This sounds very similar to <strong>{duplicateMatch.title}</strong>, which you have already captured.
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Link 
                  to={`/knowledge/${duplicateMatch.id}`}
                  style={{ 
                    backgroundColor: 'var(--color-text)', 
                    color: 'var(--color-bg)', 
                    padding: '0.8rem 1.5rem', 
                    borderRadius: 'var(--radius-md)', 
                    textDecoration: 'none',
                    fontWeight: 500
                  }}
                >
                  Open {duplicateMatch.title}
                </Link>
                <button 
                  onClick={() => proceedWithGeneration((content + ' ' + (speechState === 'listening' ? transcript : '')).trim())}
                  disabled={isSubmitting}
                  style={{ 
                    backgroundColor: 'transparent', 
                    color: 'var(--color-text)', 
                    border: '1px solid var(--color-border)', 
                    padding: '0.8rem 1.5rem', 
                    borderRadius: 'var(--radius-md)', 
                    fontWeight: 500,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.5 : 1
                  }}
                >
                  No, continue creating new
                </button>
              </div>
            </div>
          )}

          <div style={{ flexDirection: 'column', gap: '1.5rem', display: duplicateMatch ? 'none' : 'flex' }}>
            <div style={{ position: 'relative' }}>
              <textarea 
                placeholder="What did you just learn? You can type a single concept or describe a thought naturally..." 
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
                  fontSize: '1.3rem', 
                  border: 'none', 
                  resize: 'vertical', 
                  fontFamily: 'var(--font-sans)', 
                  color: speechState === 'listening' ? 'var(--color-text)' : 'var(--color-text-secondary)', 
                  padding: '1rem 0', 
                  backgroundColor: 'transparent',
                  lineHeight: 1.6
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
                      width: '50px',
                      height: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontSize: '1.5rem'
                    }}
                    title={speechState === 'listening' ? 'Stop Recording' : 'Start Recording'}
                  >
                    {/* SVG Mic Icon */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                      <line x1="12" y1="19" x2="12" y2="23"></line>
                      <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <input 
                type="text" 
                placeholder="Context (e.g. From today's supply chain lecture)"
                value={sourceContext}
                onChange={(e) => setSourceContext(e.target.value)}
                style={{
                  flex: '1 1 300px',
                  padding: '0.8rem 1rem',
                  fontSize: '0.95rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text-obsidian)',
                  fontFamily: 'var(--font-sans)'
                }}
              />
              <button 
                onClick={handleInitialCommit}
                disabled={isSubmitting || (!content.trim() && !transcript.trim())}
                style={{ 
                  backgroundColor: 'var(--color-accent-terracotta)', 
                  color: 'white', 
                  border: 'none', 
                  padding: '1rem 2.5rem', 
                  borderRadius: '2rem', 
                  fontSize: '1.1rem', 
                  fontWeight: 600,
                  opacity: (isSubmitting || (!content.trim() && !transcript.trim())) ? 0.5 : 1,
                  cursor: (isSubmitting || (!content.trim() && !transcript.trim())) ? 'not-allowed' : 'pointer'
                }}
              >
                {isSubmitting ? 'Synthesizing...' : 'Commit to Memory'}
              </button>
            </div>
          </div>
        </>
      ) : (
        /* PASTE NOTES MODE */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {extractedConcepts.length === 0 ? (
            <>
              <div style={{ position: 'relative' }}>
                <textarea 
                  placeholder="Paste an article, lecture transcript, or notes here. Smriti will extract the key concepts." 
                  value={pasteContent}
                  onChange={(e) => {
                    if (e.target.value.length <= PASTE_MAX_CHARS) {
                      setPasteContent(e.target.value);
                    }
                  }}
                  style={{ 
                    width: '100%', 
                    minHeight: '400px', 
                    fontSize: '1.1rem', 
                    border: '1px solid var(--color-border)', 
                    borderRadius: '8px',
                    resize: 'vertical', 
                    fontFamily: 'var(--font-sans)', 
                    color: 'var(--color-text-obsidian)', 
                    padding: '1rem', 
                    backgroundColor: 'var(--color-card-bg)',
                    lineHeight: 1.6
                  }}
                />
                <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', fontSize: '0.8rem', color: pasteContent.length >= PASTE_MAX_CHARS ? 'var(--color-accent-terracotta)' : 'var(--color-text-secondary)', fontWeight: 500, backgroundColor: 'var(--color-card-bg)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                  {pasteContent.length.toLocaleString()} / {PASTE_MAX_CHARS.toLocaleString()} characters
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <input 
                  type="text" 
                  placeholder="Source / Context (e.g. Paul Graham's essay)"
                  value={pasteSourceContext}
                  onChange={(e) => setPasteSourceContext(e.target.value)}
                  style={{
                    flex: '1 1 300px',
                    padding: '0.8rem 1rem',
                    fontSize: '0.95rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-card-bg)',
                    color: 'var(--color-text-obsidian)',
                    fontFamily: 'var(--font-sans)'
                  }}
                />
                <button 
                  onClick={handleExtractConcepts}
                  disabled={isExtracting || !pasteContent.trim()}
                  style={{ 
                    backgroundColor: 'var(--color-accent-terracotta)', 
                    color: 'white', 
                    border: 'none', 
                    padding: '1rem 2.5rem', 
                    borderRadius: '2rem', 
                    fontSize: '1.1rem', 
                    fontWeight: 600,
                    opacity: (isExtracting || !pasteContent.trim()) ? 0.5 : 1,
                    cursor: (isExtracting || !pasteContent.trim()) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isExtracting ? 'Extracting Concepts...' : 'Extract Concepts'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-text-obsidian)' }}>Select Concepts to Save</h3>
                <button onClick={() => setExtractedConcepts([])} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', textDecoration: 'underline' }}>
                  Discard and edit text
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {extractedConcepts.map((concept, idx) => (
                  <label key={idx} style={{ 
                    display: 'flex', 
                    gap: '1rem', 
                    alignItems: 'flex-start',
                    padding: '1rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--color-card-bg)',
                    cursor: (isBatchSaving || concept.status !== 'pending') ? 'default' : 'pointer',
                    opacity: (concept.status === 'success' || concept.status === 'duplicate') ? 0.6 : 1
                  }}>
                    <input 
                      type="checkbox" 
                      checked={concept.selected}
                      disabled={isBatchSaving || concept.status !== 'pending'}
                      onChange={(e) => {
                        const next = [...extractedConcepts];
                        next[idx].selected = e.target.checked;
                        setExtractedConcepts(next);
                      }}
                      style={{ marginTop: '0.3rem', transform: 'scale(1.2)' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: 'var(--color-text-obsidian)' }}>{concept.title}</h4>
                        {concept.status === 'duplicate' && <span style={{ fontSize: '0.75rem', color: '#B91C1C', backgroundColor: '#FEE2E2', padding: '0.1rem 0.5rem', borderRadius: '1rem' }}>Duplicate</span>}
                        {concept.status === 'success' && <span style={{ fontSize: '0.75rem', color: '#15803d', backgroundColor: '#dcfce7', padding: '0.1rem 0.5rem', borderRadius: '1rem' }}>Saved</span>}
                        {concept.status === 'error' && <span style={{ fontSize: '0.75rem', color: '#B91C1C', backgroundColor: '#FEE2E2', padding: '0.1rem 0.5rem', borderRadius: '1rem' }}>Failed</span>}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                        {concept.summary}
                      </p>
                    </div>
                  </label>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                  {isBatchSaving ? batchProgress : `${extractedConcepts.filter(c => c.selected && c.status === 'pending').length} concepts selected`}
                </span>
                <button 
                  onClick={handleBatchIngest}
                  disabled={isBatchSaving || extractedConcepts.filter(c => c.selected && c.status === 'pending').length === 0}
                  style={{ 
                    backgroundColor: 'var(--color-accent-terracotta)', 
                    color: 'white', 
                    border: 'none', 
                    padding: '1rem 2.5rem', 
                    borderRadius: '2rem', 
                    fontSize: '1.1rem', 
                    fontWeight: 600,
                    opacity: (isBatchSaving || extractedConcepts.filter(c => c.selected && c.status === 'pending').length === 0) ? 0.5 : 1,
                    cursor: (isBatchSaving || extractedConcepts.filter(c => c.selected && c.status === 'pending').length === 0) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isBatchSaving ? 'Saving Concepts...' : 'Commit Selected to Memory'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
