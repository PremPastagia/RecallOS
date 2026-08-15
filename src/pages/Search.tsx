

export function Search() {
  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <div className="search-container" style={{ width: '100%', maxWidth: '100%' }}>
        <input 
          type="text" 
          className="search-input" 
          placeholder="Search your knowledge vault..." 
          autoFocus
        />
      </div>
      
      <div style={{ marginTop: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        <p>Begin typing to explore your connected concepts.</p>
      </div>
    </div>
  );
}
