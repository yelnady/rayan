import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { settingsApi } from '../../services/settingsApi';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStatus('idle');
    setApiKey('');
    settingsApi.getSettings().then((s) => {
      setHasKey(s.hasGeminiKey);
      setPreview(s.geminiApiKeyPreview);
    }).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  if (!open) return null;

  async function handleSave() {
    const key = apiKey.trim() || null;
    setSaving(true);
    setStatus('idle');
    try {
      await settingsApi.saveSettings(key);
      setHasKey(!!key);
      setPreview(key ? `${key.slice(0, 8)}...` : null);
      setApiKey('');
      setStatus('saved');
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    setStatus('idle');
    try {
      await settingsApi.saveSettings(null);
      setHasKey(false);
      setPreview(null);
      setApiKey('');
      setStatus('saved');
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-glass backdrop-blur-xl border border-border rounded-3xl shadow-2xl p-6 flex flex-col gap-5 w-full max-w-sm mx-4 animate-[fadeIn_0.2s_ease]"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.5)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-body font-semibold text-[15px] text-text-primary tracking-[0.01em]">Settings</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[rgba(0,0,0,0.04)] flex items-center justify-center border-none cursor-pointer text-text-muted hover:bg-[rgba(0,0,0,0.08)] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Section */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="font-body text-[11px] font-semibold text-text-muted uppercase tracking-[0.06em]">
              Gemini API Key
            </span>
            <span className="font-body text-[12px] text-text-muted leading-[1.4]">
              {hasKey
                ? <>Active key: <span className="font-mono text-text-primary">{preview}</span></>
                : 'No key set — using shared quota.'}
            </span>
          </div>

          <input
            ref={inputRef}
            type="password"
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setStatus('idle'); }}
            placeholder="AIza…"
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-[rgba(0,0,0,0.03)] font-mono text-[13px] text-text-primary placeholder:text-text-muted outline-none focus:border-primary focus:ring-2 focus:ring-[rgba(99,102,241,0.15)] transition-all"
          />

          {status === 'saved' && (
            <span className="font-body text-[12px] text-success">Saved successfully.</span>
          )}
          {status === 'error' && (
            <span className="font-body text-[12px] text-error">Failed to save. Please try again.</span>
          )}

          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-[11px] text-primary hover:underline self-start"
          >
            Get a free key at Google AI Studio →
          </a>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {hasKey && (
            <button
              onClick={handleClear}
              disabled={saving}
              className="flex-1 py-2 px-3 rounded-xl border border-border bg-transparent font-body text-[13px] font-medium text-error hover:bg-[rgba(239,68,68,0.06)] cursor-pointer transition-colors disabled:opacity-40"
            >
              Remove Key
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !apiKey.trim()}
            className="flex-1 py-2 px-3 rounded-xl border-none bg-primary font-body text-[13px] font-medium text-white cursor-pointer transition-opacity disabled:opacity-40 hover:opacity-90"
          >
            {saving ? 'Saving…' : 'Save Key'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
