import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { KnowledgeService } from '../lib/dataService';
import { calculateNextReviewState } from '../lib/spacedRepetition';
import type { KnowledgeItem, Question, ReviewGrade } from '../lib/types';

export function Review() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [directRecallAnswer, setDirectRecallAnswer] = useState('');

  useEffect(() => {
    async function initReview() {
      try {
        const dueItems = await KnowledgeService.getDueForReview();
        if (dueItems.length === 0) {
          setLoading(false);
          return;
        }
        
        setItems(dueItems);

        // Fetch questions from Gemini
        const response = await fetch('/api/generate-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ concepts: dueItems })
        });
        
        if (!response.ok) throw new Error('Failed to generate review questions');
        
        const data = await response.json();
        setQuestions(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'An error occurred setting up the review.');
      } finally {
        setLoading(false);
      }
    }
    initReview();
  }, []);

  const handleGrade = async (grade: ReviewGrade) => {
    const currentQuestion = questions[currentIndex];
    const item = items.find(i => i.id === currentQuestion.id);
    
    if (item) {
      const newState = calculateNextReviewState(item.reviewState, grade);
      try {
        await KnowledgeService.updateReviewState(item.id, newState);
      } catch (err) {
        console.error('Failed to update review state', err);
      }
    }
    
    // Move to next
    setShowEvaluation(false);
    setSelectedOption(null);
    setDirectRecallAnswer('');
    setCurrentIndex(prev => prev + 1);
  };

  const handleMCSelect = (option: string) => {
    setSelectedOption(option);
    setShowEvaluation(true);
  };

  const handleDirectRecallReveal = () => {
    setShowEvaluation(true);
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
    return (
      <div style={{ textAlign: 'center', marginTop: '4rem' }}>
        <h2 style={{ color: 'var(--color-text)' }}>Session Complete</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
          You've reviewed {questions.length} concepts.
        </p>
        <Link to="/" style={{ color: 'var(--color-accent-terracotta)', textDecoration: 'none' }}>Return to Home</Link>
      </div>
    );
  }

  const question = questions[currentIndex];
  const progress = ((currentIndex) / questions.length) * 100;

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
          ) : (
            <div>
              <textarea 
                value={directRecallAnswer}
                onChange={(e) => setDirectRecallAnswer(e.target.value)}
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
            backgroundColor: selectedOption === question.correctAnswer ? '#ECFCCB' : '#FEE2E2', 
            borderRadius: 'var(--radius-md)',
            marginBottom: '2rem'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: selectedOption === question.correctAnswer ? '#4D7C0F' : '#B91C1C' }}>
              {selectedOption === question.correctAnswer ? 'Correct!' : 'The answer is:'}
            </h3>
            <p style={{ margin: '0 0 1rem 0', fontWeight: 500 }}>{question.correctAnswer}</p>
            <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.8 }}>{question.explanation}</p>
          </div>

          <h4 style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginBottom: '1rem', fontWeight: 400 }}>
            How hard was it to remember this?
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
                  color: 'var(--color-text)'
                }}
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
