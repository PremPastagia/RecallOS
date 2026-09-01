
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function Layout() {
  const { signOut } = useAuth();

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <Link to="/" className="brand" style={{ color: 'inherit' }}>
          <span className="brand-sanskrit">स्मृति</span>
          <span>Smriti</span>
        </Link>
        <nav className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link to="/">Home</Link>
          <Link to="/add">Add Concept</Link>
          <Link to="/search">Search</Link>
          <Link to="/connections">Connections</Link>
          <Link to="/review">Review</Link>
          <Link to="/vault">Vault</Link>
          <button 
            onClick={signOut}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--color-text-secondary)', 
              cursor: 'pointer', 
              fontSize: '1rem',
              padding: 0
            }}
          >
            Sign Out
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
