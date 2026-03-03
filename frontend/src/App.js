import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { GoogleSignIn } from './components/auth/GoogleSignIn';
import { PalacePage } from './pages/PalacePage';
function AuthGuard({ children }) {
    const { user, loading } = useAuth();
    if (loading)
        return _jsx("div", { children: "Loading\u2026" });
    if (!user)
        return _jsx(Navigate, { to: "/login", replace: true });
    return _jsx(_Fragment, { children: children });
}
function LoginPage() {
    const { user, loading } = useAuth();
    if (loading)
        return _jsx("div", { children: "Loading\u2026" });
    if (user)
        return _jsx(Navigate, { to: "/", replace: true });
    return (_jsx("div", { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }, children: _jsxs("div", { style: { textAlign: 'center' }, children: [_jsx("h1", { children: "Rayan Memory Palace" }), _jsx(GoogleSignIn, {})] }) }));
}
function PlaceholderPage({ name }) {
    return _jsxs("div", { style: { padding: '2rem' }, children: [name, " \u2014 coming soon"] });
}
export default function App() {
    return (_jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/", element: _jsx(AuthGuard, { children: _jsx(PalacePage, {}) }) }), _jsx(Route, { path: "/dashboard", element: _jsx(AuthGuard, { children: _jsx(PlaceholderPage, { name: "Dashboard" }) }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }));
}
