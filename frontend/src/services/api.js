import { auth } from '../config/firebase';
import { API_V1 } from '../config/api';
async function getIdToken() {
    const user = auth.currentUser;
    if (!user)
        throw new Error('Not authenticated');
    return user.getIdToken();
}
async function request(path, init = {}) {
    const token = await getIdToken();
    const response = await fetch(`${API_V1}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...init.headers,
        },
    });
    if (!response.ok) {
        const errorBody = (await response.json().catch(() => null));
        const message = errorBody?.error?.message ?? `HTTP ${response.status}`;
        throw new Error(message);
    }
    return response.json();
}
export const apiGet = (path) => request(path, { method: 'GET' });
export const apiPost = (path, body) => request(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined });
export const apiPatch = (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) });
export const apiDelete = (path) => request(path, { method: 'DELETE' });
