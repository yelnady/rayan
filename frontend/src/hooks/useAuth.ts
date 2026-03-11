import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, ensureAuthPersistence } from '../config/firebase';
import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  const { user, loading, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    async function initializeAuth() {
      // Wait for Firebase to finish loading from persistence (IndexedDB)
      await ensureAuthPersistence();

      if (!isMounted) return;

      // Now that we're sure persistence is checked, set up the listener
      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (!isMounted) return;
        setUser(firebaseUser);
        setLoading(false);
      });
    }

    initializeAuth();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [setUser, setLoading]);

  return { user, loading };
}
