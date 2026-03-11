/**
 * ArtifactDetailModal — full-screen modal for viewing artifact details.
 *
 * Triggered when the user clicks an artifact in the 3D palace.
 * Displays:
 *   - Artifact summary and full content
 *   - Rayan's Summary (from voiceStore narration)
 *   - Similar memories (vector search)
 *   - Delete action
 *
 * Data sources:
 *   - REST: GET /artifacts/{artifactId} for full content
 *   - REST: GET /artifacts/{artifactId}/related for similar memories
 *   - WebSocket: artifact_recall message wired into voiceStore
 */

import { useEffect, useState } from 'react';
import { useVoiceStore } from '../../stores/voiceStore';
import { usePalaceStore } from '../../stores/palaceStore';
import { API_BASE_URL } from '../../config/api';
import { useAuthStore } from '../../stores/authStore';

export interface ArtifactDetailData {
    id: string;
    roomId: string;
    type: string;
    visual: string;
    summary: string;
    fullContent?: string;
    thumbnailUrl?: string;
    createdAt: string;
    capturedAt?: string;
    color?: string;
}

interface RelatedMemory {
    artifactId: string;
    roomId: string;
    roomName: string;
    summary: string;
    similarity: number;
}

interface ArtifactDetailModalProps {
    artifactId: string;
    onClose: () => void;
}

export function ArtifactDetailModal({ artifactId, onClose }: ArtifactDetailModalProps) {
    const [artifact, setArtifact] = useState<ArtifactDetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [relatedMemories, setRelatedMemories] = useState<RelatedMemory[]>([]);
    const [relatedLoading, setRelatedLoading] = useState(false);

    const narration = useVoiceStore((s) => s.currentNarration);
    const { user } = useAuthStore();

    // ── Fetch full artifact details from REST API ───────────────────────────────
    useEffect(() => {
        if (!user) return;
        let cancelled = false;

        const fetchArtifact = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = await user.getIdToken();
                const res = await fetch(`${API_BASE_URL}/artifacts/${artifactId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                if (!cancelled) {
                    setArtifact(json.artifact as ArtifactDetailData);
                }
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load artifact');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void fetchArtifact();
        return () => { cancelled = true; };
    }, [artifactId, user]);

    // ── Fetch similar memories via vector search ────────────────────────────────
    useEffect(() => {
        if (!user || loading) return;
        let cancelled = false;

        const fetchRelated = async () => {
            setRelatedLoading(true);
            try {
                const token = await user.getIdToken();
                const res = await fetch(`${API_BASE_URL}/artifacts/${artifactId}/related?threshold=0.50&limit=5`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) return;
                const json = await res.json();
                if (!cancelled) setRelatedMemories(json.related ?? []);
            } catch {
                // silently ignore — similar memories are non-critical
            } finally {
                if (!cancelled) setRelatedLoading(false);
            }
        };

        void fetchRelated();
        return () => { cancelled = true; };
    }, [artifactId, user, loading]);

    // ── Delete handler ──────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!user || deleting) return;
        if (!window.confirm('Delete this memory artifact? This cannot be undone.')) return;
        setDeleting(true);
        try {
            const token = await user.getIdToken();
            await fetch(`${API_BASE_URL}/artifacts/${artifactId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            usePalaceStore.getState().removeArtifact(artifactId);
            onClose();
        } catch {
            setDeleting(false);
        }
    };

    const accentColor = artifact?.color ?? '#6366f1';

    return (
        <div
            id={`artifact-detail-modal-${artifactId}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="artifact-modal-title"
            className="fixed inset-0 bg-overlay backdrop-blur-sm z-[1100] flex items-center justify-center p-6 animate-[fadeIn_0.2s_ease]"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-surface border border-border rounded-[24px] w-full max-w-[580px] max-h-[85vh] flex flex-col overflow-hidden shadow-lg animate-[scaleIn_0.25s_ease]">
                {/* Header */}
                <div
                    className="p-5 pb-4 border-b border-border-light shrink-0"
                    style={{ background: `linear-gradient(135deg, ${accentColor}18 0%, transparent 60%)` }}
                >
                    <div className="flex justify-between items-center mb-2">
                        <span
                            className="text-[10px] font-bold uppercase tracking-[0.1em] rounded-sm py-[3px] px-2 font-body"
                            style={{ color: accentColor, background: `${accentColor}22`, border: `1px solid ${accentColor}44` }}
                        >
                            {artifact?.type ?? '…'}
                        </span>
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="bg-surface-hover border-none rounded-full w-[30px] h-[30px] text-text-muted cursor-pointer text-sm flex items-center justify-center transition-colors duration-200 hover:bg-surface-alt"
                        >
                            ✕
                        </button>
                    </div>
                    <h2 id="artifact-modal-title" className="text-text-primary text-[18px] font-semibold font-heading m-0 leading-[1.35]">
                        {loading ? 'Loading…' : (artifact?.summary ?? 'Artifact')}
                    </h2>
                </div>

                {/* Body */}
                <div className="overflow-y-auto py-4 px-5 flex-1 flex flex-col gap-5">
                    {loading && (
                        <div className="flex flex-col items-center gap-3 py-8">
                            <div className="w-8 h-8 rounded-full border-[2.5px] border-primary-muted border-t-primary animate-spin" />
                            <span className="text-text-muted text-[13px]">Loading memory…</span>
                        </div>
                    )}

                    {error && (
                        <p className="text-error text-[13px] font-body m-0 py-3">{error}</p>
                    )}

                    {/* Full content */}
                    {!loading && artifact?.fullContent && (
                        <section>
                            <h3 className="text-text-muted text-[10px] font-bold uppercase tracking-[0.1em] mb-2 mt-0 font-body">Content</h3>
                            <p className="text-text-secondary text-[14px] leading-[1.7] m-0 font-body">{artifact.fullContent}</p>
                        </section>
                    )}

                    {/* Rayan's Summary (from artifact_recall narration) */}
                    {narration?.summary && (
                        <section>
                            <h3 className="text-text-muted text-[10px] font-bold uppercase tracking-[0.1em] mb-2 mt-0 font-body">Rayan's Summary</h3>
                            <p className="text-[rgba(99,102,241,0.9)] text-[14px] leading-[1.7] m-0 font-body">{narration.summary}</p>
                        </section>
                    )}

                    {/* Similar memories via semantic search */}
                    {(relatedLoading || relatedMemories.length > 0) && (
                        <section>
                            <h3 className="text-text-muted text-[10px] font-bold uppercase tracking-[0.1em] mb-2 mt-0 font-body">Similar Memories</h3>
                            {relatedLoading ? (
                                <div className="flex items-center gap-2 text-text-faint text-[12px] font-body">
                                    <div className="w-3 h-3 rounded-full border-[2px] border-primary-muted border-t-primary animate-spin" />
                                    Finding similar memories…
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {relatedMemories.map((m) => {
                                        const pct = Math.round(m.similarity * 100);
                                        const color = pct >= 90 ? '#10b981' : pct >= 80 ? '#6366f1' : '#f59e0b';
                                        const handleClick = () => {
                                            onClose();
                                            usePalaceStore.getState().setHighlightedArtifacts([m.artifactId]);
                                            setTimeout(() => usePalaceStore.getState().setHighlightedArtifacts([]), 5_000);
                                            usePalaceStore.getState().setAgentSelectedArtifactId(m.artifactId);
                                        };
                                        return (
                                            <button
                                                key={m.artifactId}
                                                onClick={handleClick}
                                                className="flex items-start gap-2.5 bg-surface-hover hover:bg-surface-alt rounded-xl px-3 py-2.5 border border-border-light hover:border-primary/30 transition-colors text-left w-full cursor-pointer"
                                            >
                                                <span
                                                    className="shrink-0 text-[10px] font-bold rounded-full px-2 py-0.5 mt-0.5 font-body"
                                                    style={{ color, background: `${color}22`, border: `1px solid ${color}44` }}
                                                >
                                                    {pct}%
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="m-0 text-[13px] text-text-secondary font-body leading-snug truncate">{m.summary}</p>
                                                    <p className="m-0 text-[11px] text-text-faint font-body mt-0.5">{m.roomName}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    )}

                    {/* Meta */}
                    {(artifact?.capturedAt || artifact?.createdAt) && (
                        <p className="text-text-faint text-[11px] font-body m-0">
                            Captured {new Date(artifact.capturedAt || artifact.createdAt).toLocaleString(undefined, {
                                month: 'long', day: 'numeric', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                            })}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="py-3 px-5 border-t border-border-light flex justify-end shrink-0">
                    <button
                        onClick={handleDelete}
                        disabled={deleting || loading}
                        className="bg-error-muted border border-error-border rounded-md text-error cursor-pointer text-[13px] py-[7px] px-3.5 font-body font-medium transition-colors hover:bg-[rgba(239,68,68,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Delete artifact"
                    >
                        {deleting ? 'Deleting…' : 'Delete Memory'}
                    </button>
                </div>
            </div>
        </div>
    );
}
