import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '400px', margin: '4rem auto 0 auto' }}>
      <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '2rem' }}>Welcome Back</h2>
      
      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input 
          type="email" 
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: '1rem', fontSize: '1rem', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
        />
        <input 
          type="password" 
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: '1rem', fontSize: '1rem', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
        />
        <button 
          type="submit"
          disabled={loading}
          style={{ 
            marginTop: '1rem',
            width: '100%',
            backgroundColor: 'var(--color-text)', 
            color: 'var(--color-bg)', 
            border: 'none', 
            padding: '1rem', 
            borderRadius: 'var(--radius-md)', 
            fontSize: '1rem', 
            fontWeight: 500,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Entering...' : 'Enter Vault'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--color-text-secondary)' }}>
        Don't have a vault? <Link to="/signup" style={{ color: 'var(--color-accent-terracotta)', textDecoration: 'none' }}>Create one</Link>
      </p>
    </div>
  );
}
