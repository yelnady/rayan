import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuthStore } from '../stores/authStore';
export function useAuth() {
    const { user, loading, setUser, setLoading } = useAuthStore();
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
        });
        return unsubscribe;
    }, [setUser, setLoading]);
    return { user, loading };
}
