import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { KnowledgeService } from '../lib/dataService';
import { calculateNextReviewState } from '../lib/spacedRepetition';
import { ReviewSessionManager, ReviewHistoryTracker, type ReviewSessionData } from '../lib/reviewSession';
import type { KnowledgeItem, Question, ReviewGrade } from '../lib/types';

export function Review() {
  const [searchParams] = useSearchParams();
  const targetConceptId = searchParams.get('conceptId');

  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [directRecallAnswer, setDirectRecallAnswer] = useState('');
  const [sessionResults, setSessionResults] = useState<{ id: string; title: string; grade: ReviewGrade; nextReviewDate: string }[]>([]);

  // Keep a reference to the active session
  const [activeSession, setActiveSession] = useState<ReviewSessionData | null>(null);

  useEffect(() => {
    async function initReview() {
      try {
        // Targeted review bypasses the session completely
        if (targetConceptId) {
          const item = await KnowledgeService.getById(targetConceptId);
          if (!item) {
            setLoading(false);
            return;
          }
          const reviewItems = [item];
          setItems(reviewItems);

          const response = await fetch('/api/generate-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ concepts: reviewItems })
          });
          if (!response.ok) throw new Error('Failed to generate review questions');
          
          const data = await response.json();
          setQuestions(data);
          setLoading(false);
          return;
        }

        // Daily review logic
        const existingSession = await ReviewSessionManager.getActiveSession();
        
        if (existingSession) {
          // Restore existing session
          setItems(existingSession.items);
          setQuestions(existingSession.questions);
          setCurrentIndex(existingSession.currentIndex);
          setSessionResults(existingSession.sessionResults);
          
          // Restore pending evaluation if present
          if (existingSession.pendingEvaluation) {
            setShowEvaluation(existingSession.pendingEvaluation.showEvaluation);
            setSelectedOption(existingSession.pendingEvaluation.selectedOption);
            setDirectRecallAnswer(existingSession.pendingEvaluation.directRecallAnswer);
          }

          // Guard: filter out any concepts deleted since this session was saved
          const allCurrentIds = new Set((await KnowledgeService.getAll()).map(c => c.id));
          const aliveItems = existingSession.items.filter(i => allCurrentIds.has(i.id));
          const aliveQuestions = existingSession.questions.filter(q => allCurrentIds.has(q.id));
          const safeIndex = Math.min(existingSession.currentIndex, Math.max(0, aliveItems.length - 1));

          setItems(aliveItems);
          setQuestions(aliveQuestions);
          setCurrentIndex(safeIndex);
          
          setActiveSession(existingSession);
          setLoading(false);

        } else {
          // Generate new session
          const reviewItems = await KnowledgeService.getDueForReview();
          if (reviewItems.length === 0) {
            setLoading(false);
            return;
          }
          
          setItems(reviewItems);

          const response = await fetch('/api/generate-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ concepts: reviewItems })
          });
          
          if (!response.ok) throw new Error('Failed to generate review questions');
          
          const data = await response.json();
          setQuestions(data);
          
          const newSession = await ReviewSessionManager.createSession(reviewItems, data);
          setActiveSession(newSession);
          setLoading(false);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'An error occurred setting up the review.');
        setLoading(false);
      }
    }
    initReview();
  }, [targetConceptId]);

  const savePendingEvaluation = (show: boolean, option: string | null, answer: string) => {
    if (activeSession && !targetConceptId) {
      const updatedSession = { 
        ...activeSession, 
        pendingEvaluation: {
          showEvaluation: show,
          selectedOption: option,
          directRecallAnswer: answer
        }
      };
      ReviewSessionManager.saveSession(updatedSession);
      setActiveSession(updatedSession);
    }
  };

  const handleGrade = async (grade: ReviewGrade) => {
    const currentQuestion = questions[currentIndex];
    const item = items.find(i => i.id === currentQuestion.id);
    
    let updatedResults = [...sessionResults];

    if (item) {
      const newState = calculateNextReviewState(item.reviewState, grade);
      try {
        await KnowledgeService.updateReviewState(item.id, newState);
        ReviewHistoryTracker.recordGrade(grade);
        const newResult = {
          id: item.id,
          title: item.title,
          grade,
          nextReviewDate: newState.nextReviewDate
        };
        updatedResults = [...sessionResults, newResult];
        setSessionResults(updatedResults);
      } catch (err) {
        console.error('Failed to update review state', err);
      }
    }
    
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);

    // Save session progress if it's a daily review
    if (activeSession && !targetConceptId) {
      const updatedSession: ReviewSessionData = { 
        ...activeSession, 
        currentIndex: nextIndex,
        sessionResults: updatedResults
      };
      delete updatedSession.pendingEvaluation; // clear evaluation state for next question
      
      if (nextIndex >= questions.length) {
        updatedSession.status = 'completed';
        ReviewSessionManager.clearSession();
      } else {
        await ReviewSessionManager.saveSession(updatedSession);
      }
      setActiveSession(updatedSession);
    }
    
    // Move to next
    setShowEvaluation(false);
    setSelectedOption(null);
    setDirectRecallAnswer('');
  };

  const handleMCSelect = (option: string) => {
    setSelectedOption(option);
    setShowEvaluation(true);
    savePendingEvaluation(true, option, directRecallAnswer);
  };

  const handleDirectRecallReveal = () => {
    setShowEvaluation(true);
    savePendingEvaluation(true, selectedOption, directRecallAnswer);
  };

  const handleDirectRecallChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDirectRecallAnswer(val);
    savePendingEvaluation(showEvaluation, selectedOption, val);
  };

  const formatReviewDate = (isoString: string) => {
    const next = new Date(isoString);
    const now = new Date();
    const diffDays = Math.round((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    return `In ${Math.round(diffDays / 7)} weeks`;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--color-text-secondary)' }}>
        Generating your custom review session...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '1rem', backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: 'var(--radius-md)' }}>
        {error}
      </div>
    );
  }

  if (items.length === 0 || questions.length === 0) {
    return (
      <div style={{ textAlign: 'center', marginTop: '4rem' }}>
        <h2 style={{ color: 'var(--color-text)' }}>You're all caught up!</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>No concepts due for review right now.</p>
        <Link to="/" style={{ color: 'var(--color-accent-terracotta)', textDecoration: 'none' }}>Return to Home</Link>
      </div>
    );
  }

  if (currentIndex >= questions.length) {
    const reinforcement = sessionResults.filter(r => r.grade === 'Again' || r.grade === 'Hard');
    const successful = sessionResults.filter(r => r.grade === 'Good' || r.grade === 'Easy');

    return (
      <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ color: 'var(--color-text)', textAlign: 'center', marginBottom: '2rem', fontSize: '2rem' }}>
          Session Complete
        </h2>
        
        {reinforcement.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--color-text-secondary)', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
              Needs Reinforcement
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {reinforcement.map((r, idx) => (
                <div key={`${r.id}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Link to={`/knowledge/${r.id}`} style={{ color: 'var(--color-text)', textDecoration: 'none', fontWeight: 500 }}>
                    {r.title}
                  </Link>
                  <span style={{ fontSize: '0.9rem', color: '#B91C1C', backgroundColor: '#FEE2E2', padding: '0.2rem 0.6rem', borderRadius: '1rem' }}>
                    Reviewing {formatReviewDate(r.nextReviewDate).toLowerCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {successful.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--color-text-secondary)', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
              Successfully Recalled
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {successful.map((r, idx) => (
                <div key={`${r.id}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Link to={`/knowledge/${r.id}`} style={{ color: 'var(--color-text)', textDecoration: 'none', fontWeight: 500 }}>
                    {r.title}
                  </Link>
                  <span style={{ fontSize: '0.9rem', color: '#4D7C0F', backgroundColor: '#ECFCCB', padding: '0.2rem 0.6rem', borderRadius: '1rem' }}>
                    Next review {formatReviewDate(r.nextReviewDate).toLowerCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <Link to={targetConceptId ? `/knowledge/${targetConceptId}` : "/"} style={{ 
            display: 'inline-block',
            backgroundColor: 'var(--color-text)', 
            color: 'var(--color-bg)', 
            padding: '1rem 2rem', 
            borderRadius: '2rem', 
            textDecoration: 'none',
            fontWeight: 600,
            transition: 'transform 0.15s ease'
          }}>
            {targetConceptId ? 'Return to Concept' : 'Return to Knowledge Vault'}
          </Link>
        </div>
      </div>
    );
  }

  const question = questions[currentIndex];
  const progress = ((currentIndex) / questions.length) * 100;

  const isWrongAnswer = question.type === 'multiple_choice'
    ? (selectedOption !== null && selectedOption !== question.correctAnswer)
    : question.type === 'cloze'
    ? directRecallAnswer.trim().toLowerCase() !== (question.clozeAnswer || question.correctAnswer).trim().toLowerCase()
    : true; // direct_recall always shows answer for self-evaluation

  return (
    <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
      {/* Progress Bar */}
      <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--color-border)', borderRadius: '3px', marginBottom: '2rem', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, backgroundColor: 'var(--color-accent-terracotta)', transition: 'width 0.3s ease' }} />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <Link to={`/knowledge/${question.id}`} target="_blank" style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', textDecoration: 'underline' }}>
          {question.conceptTitle}
        </Link>
      </div>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 500, color: 'var(--color-text)', marginBottom: '2rem', lineHeight: 1.4 }}>
        {question.question}
      </h2>

      {!showEvaluation ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {question.type === 'multiple_choice' && question.options ? (
            question.options.map((opt, i) => (
              <button 
                key={i} 
                onClick={() => handleMCSelect(opt)}
                style={{
                  padding: '1rem 1.5rem',
                  textAlign: 'left',
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '1.1rem',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s ease'
                }}
              >
                {opt}
              </button>
            ))
          ) : question.type === 'cloze' ? (
            <div>
              <p style={{ fontSize: '1.15rem', lineHeight: 1.7, color: 'var(--color-text-secondary)', marginBottom: '1.25rem', fontStyle: 'italic' }}>
                Fill in the blank:
              </p>
              <input
                type="text"
                value={directRecallAnswer}
                onChange={e => {
                  setDirectRecallAnswer(e.target.value);
                  savePendingEvaluation(showEvaluation, selectedOption, e.target.value);
                }}
                placeholder="Type the missing word or phrase..."
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1.1rem',
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text)',
                  marginBottom: '1rem',
                  fontFamily: 'inherit'
                }}
                onKeyDown={e => { if (e.key === 'Enter') handleDirectRecallReveal(); }}
              />
              <button 
                onClick={handleDirectRecallReveal}
                style={{
                  width: '100%',
                  padding: '1rem',
                  backgroundColor: 'var(--color-text)',
                  color: 'var(--color-bg)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '1.1rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Check Answer
              </button>
            </div>
          ) : (
            <div>
              <textarea 
                value={directRecallAnswer}
                onChange={handleDirectRecallChange}
                placeholder="Type your answer here to enforce recall..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '1rem',
                  fontSize: '1.1rem',
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text)',
                  marginBottom: '1rem'
                }}
              />
              <button 
                onClick={handleDirectRecallReveal}
                style={{
                  width: '100%',
                  padding: '1rem',
                  backgroundColor: 'var(--color-text)',
                  color: 'var(--color-bg)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '1.1rem',
                  fontWeight: 500
                }}
              >
                Reveal Answer
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div style={{ 
            padding: '1.5rem', 
            backgroundColor: !isWrongAnswer ? '#ECFCCB' : '#FEE2E2', 
            borderRadius: 'var(--radius-md)',
            marginBottom: '2rem',
            position: 'relative'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: !isWrongAnswer ? '#4D7C0F' : '#B91C1C' }}>
              {question.type === 'multiple_choice'
                ? (selectedOption === question.correctAnswer ? 'Correct!' : 'Not quite.')
                : question.type === 'cloze'
                ? (!isWrongAnswer ? 'Correct!' : 'Not quite.')
                : 'The True Concept:'}
            </h3>
            
            {isWrongAnswer && (question.type === 'multiple_choice' ? selectedOption : directRecallAnswer.trim()) && (
              <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: 'rgba(185, 28, 28, 0.05)', borderRadius: '6px', borderLeft: '3px solid #B91C1C' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#B91C1C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>You answered:</p>
                <p style={{ margin: '0.2rem 0 0 0', color: '#7F1D1D' }}>{question.type === 'multiple_choice' ? selectedOption : directRecallAnswer}</p>
              </div>
            )}

            <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: 'rgba(77, 124, 15, 0.05)', borderRadius: '6px', borderLeft: '3px solid #4D7C0F' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#4D7C0F', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Correct Answer:</p>
              <p style={{ margin: '0.2rem 0 0 0', fontWeight: 600, color: '#365314', fontSize: '1.1rem' }}>{question.correctAnswer}</p>
            </div>

            <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.85, color: '#1F2937', lineHeight: 1.5 }}>
              <strong>Why?</strong> {question.explanation}
            </p>

            {isWrongAnswer && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(185, 28, 28, 0.2)', textAlign: 'center' }}>
                <Link to={`/knowledge/${question.id}`} style={{
                  display: 'inline-block',
                  backgroundColor: '#B91C1C',
                  color: '#FFFFFF',
                  padding: '0.6rem 1.5rem',
                  borderRadius: '2rem',
                  textDecoration: 'none',
                  fontWeight: 500,
                  fontSize: '0.95rem',
                  boxShadow: '0 2px 8px rgba(185, 28, 28, 0.2)'
                }}>
                  Read again →
                </Link>
              </div>
            )}
          </div>

          <h4 style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginBottom: '1rem', fontWeight: 400 }}>
            {selectedOption === null ? 'How accurately did you remember this?' : 'How hard was it to remember this?'}
          </h4>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            {(['Again', 'Hard', 'Good', 'Easy'] as ReviewGrade[]).map(grade => (
              <button
                key={grade}
                onClick={() => handleGrade(grade)}
                style={{
                  flex: 1,
                  padding: '0.8rem',
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 500,
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-ivory)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg)'}
              >
                {grade}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
