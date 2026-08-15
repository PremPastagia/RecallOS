

export function Review() {
  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', textAlign: 'center', paddingTop: '4rem' }}>
      <div style={{ marginBottom: '3rem' }}>
        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Active Recall Session
        </span>
      </div>
      
      <h2 style={{ fontSize: '2rem', marginBottom: '2rem', fontFamily: 'var(--font-serif)' }}>
        Explain the concept of "First Principles Thinking"
      </h2>
      
      <div style={{ width: '100%', height: '200px', backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
        Click to reveal the core truth...
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '3rem' }}>
        <button style={{ padding: '0.8rem 2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'transparent', cursor: 'not-allowed', opacity: 0.5 }}>
          Hard
        </button>
        <button style={{ padding: '0.8rem 2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'transparent', cursor: 'not-allowed', opacity: 0.5 }}>
          Good
        </button>
        <button style={{ padding: '0.8rem 2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'transparent', cursor: 'not-allowed', opacity: 0.5 }}>
          Easy
        </button>
      </div>
    </div>
  );
}
