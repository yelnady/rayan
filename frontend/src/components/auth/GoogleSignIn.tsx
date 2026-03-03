import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../config/firebase';

const provider = new GoogleAuthProvider();

export function GoogleSignIn() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <button onClick={handleSignIn} disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in with Google'}
      </button>
      {error && <p style={{ color: 'red', margin: 0 }}>{error}</p>}
    </div>
  );
}
