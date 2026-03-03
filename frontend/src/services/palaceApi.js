import { apiGet, apiPatch, apiPost } from './api';
export const palaceApi = {
    getPalace: () => apiGet('/palace'),
    createPalace: () => apiPost('/palace'),
    updateLayout: (body) => apiPatch('/palace/layout', body),
    getRoom: (roomId) => apiGet(`/rooms/${roomId}`),
    accessRoom: (roomId) => apiPost(`/rooms/${roomId}/access`),
};
