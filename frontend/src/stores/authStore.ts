import { create } from 'zustand';
import type { User } from 'firebase/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

const getCachedUser = () => {
  try {
    const cached = localStorage.getItem('rayan-auth-user');
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: getCachedUser(),
  loading: !getCachedUser(),
  setUser: (user) => {
    if (user) {
      localStorage.setItem('rayan-auth-user', JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      }));
    } else {
      localStorage.removeItem('rayan-auth-user');
    }
    set({ user });
  },
  setLoading: (loading) => set({ loading }),
}));
