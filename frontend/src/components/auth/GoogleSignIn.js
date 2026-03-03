import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../config/firebase';
const provider = new GoogleAuthProvider();
export function GoogleSignIn() {
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    async function handleSignIn() {
        setError(null);
        setLoading(true);
        try {
            await signInWithPopup(auth, provider);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Sign-in failed');
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }, children: [_jsx("button", { onClick: handleSignIn, disabled: loading, children: loading ? 'Signing in…' : 'Sign in with Google' }), error && _jsx("p", { style: { color: 'red', margin: 0 }, children: error })] }));
}
