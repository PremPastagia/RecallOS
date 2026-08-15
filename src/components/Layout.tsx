
import { Link, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <Link to="/" className="brand" style={{ color: 'inherit' }}>
          <span className="brand-sanskrit">स्मृति</span>
          <span>Smriti</span>
        </Link>
        <nav className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/add">Add Concept</Link>
          <Link to="/search">Search</Link>
          <Link to="/review">Review</Link>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
