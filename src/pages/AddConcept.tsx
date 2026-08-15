

export function AddConcept() {
  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <h2 className="section-title">Record a New Concept</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '2rem' }}>
        <input 
          type="text" 
          className="search-input" 
          placeholder="Concept Title (e.g., First Principles)" 
          style={{ width: '100%', fontSize: '1.5rem', fontWeight: 600, border: 'none', borderBottom: '1px solid var(--color-border)', borderRadius: 0, padding: '0.5rem 0', backgroundColor: 'transparent' }}
        />
        <textarea 
          placeholder="Distill the essence of this concept. What makes it fundamentally true?" 
          style={{ width: '100%', minHeight: '300px', fontSize: '1.1rem', border: 'none', resize: 'vertical', fontFamily: 'var(--font-sans)', color: 'var(--color-text-secondary)', padding: '1rem 0', backgroundColor: 'transparent' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button style={{ backgroundColor: 'var(--color-accent-terracotta)', color: 'white', border: 'none', padding: '0.8rem 2rem', borderRadius: 'var(--radius-md)', fontSize: '1rem', fontWeight: 500 }}>
            Commit to Memory
          </button>
        </div>
      </div>
    </div>
  );
}
