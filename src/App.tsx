import React from 'react';
import './index.css';

// Mock data to scaffold the UI without a backend
const mockDailyQueue = [
  {
    id: '1',
    title: 'First Principles Thinking',
    summary: 'Deconstruct problems to fundamental truths and reconstruct from the ground up.',
    strength: 0.85
  },
  {
    id: '2',
    title: 'Inversion Principle',
    summary: 'Address complex problems by considering the opposite of what you want to achieve.',
    strength: 0.60
  },
  {
    id: '3',
    title: 'Expected Value Framework',
    summary: 'Mathematical model for decisions with uncertain outcomes and probabilities.',
    strength: 0.92
  }
];

function App() {
  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand">
          <span className="brand-sanskrit">स्मृति</span>
          <span>Smriti</span>
        </div>
        <nav className="nav-links">
          <a href="#">Home</a>
          <a href="#">Vault</a>
          <a href="#">History</a>
          <a href="#">Profile</a>
        </nav>
      </header>

      {/* Main Content */}
      <main className="main-content">
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
          
          <div className="queue-grid">
            {mockDailyQueue.map((concept) => (
              <div key={concept.id} className="concept-card">
                <h3 className="concept-title">{concept.title}</h3>
                <p className="concept-summary">{concept.summary}</p>
                <div className="memory-indicator">
                  <span>Memory strength</span>
                  <div className="ring-icon" style={{ opacity: Math.max(0.3, concept.strength) }}></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Intellectual Explorations */}
        <section className="queue-section" style={{ marginTop: '2rem' }}>
          <h2 className="section-title">Recent Intellectual Explorations</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p><strong>Second-Order Thinking</strong> - Considering long-term systemic consequences</p>
            <p><strong>Bayesian Updating</strong> - Adjusting beliefs based on new evidence</p>
            <p><strong>Map is not the Territory</strong> - Models are abstractions of reality</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
