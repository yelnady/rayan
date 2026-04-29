import { apiGet, apiPut } from './api';

export interface UserSettings {
  hasGeminiKey: boolean;
  geminiApiKeyPreview: string | null;
}

export const settingsApi = {
  getSettings: () => apiGet<UserSettings>('/settings'),
  saveSettings: (geminiApiKey: string | null) =>
    apiPut<{ ok: boolean }>('/settings', { geminiApiKey }),
};
