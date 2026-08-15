import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Supabase Auth handles putting the user in auth.users
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    // The profiles table triggers might handle the rest, or they can just use the DB
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // In a real app we might tell them to check their email, but we'll just redirect to home
      // assuming email confirmation is disabled for local dev testing.
      navigate('/');
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '400px', margin: '4rem auto 0 auto' }}>
      <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '2rem' }}>Create Vault</h2>
      
      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
          {loading ? 'Initializing...' : 'Initialize Memory Vault'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--color-text-secondary)' }}>
        Already have a vault? <Link to="/login" style={{ color: 'var(--color-accent-terracotta)', textDecoration: 'none' }}>Enter here</Link>
      </p>
    </div>
  );
}
