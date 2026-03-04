/**
 * ArtifactDetailModal — full-screen modal for viewing artifact details.
 *
 * Triggered when the user clicks an artifact in the 3D palace.
 * Displays:
 *   - Artifact summary and full content
 *   - Generated diagrams from artifact_recall
 *   - Related artifacts (RelatedArtifacts component)
 *   - Enrichments (US4, shown as placeholders if empty)
 *   - Delete action
 *
 * Data sources:
 *   - REST: GET /artifacts/{artifactId} for full content
 *   - WebSocket: artifact_recall message wired into voiceStore
 */

import React, { useEffect, useState } from 'react';
import { useVoiceStore } from '../../stores/voiceStore';
import { useEnrichmentStore } from '../../stores/enrichmentStore';
import { RelatedArtifacts } from './RelatedArtifacts';
import { GeneratedDiagramCard } from '../voice/GeneratedDiagram';
import { EnrichmentPanel } from '../enrichment/EnrichmentPanel';
import { API_BASE_URL } from '../../config/api';
import { useAuthStore } from '../../stores/authStore';
import { colors, fonts, radii, shadows, zIndex } from '../../config/tokens';

export interface ArtifactDetailData {
    id: string;
    roomId: string;
    type: string;
    visual: string;
    summary: string;
    fullContent?: string;
    thumbnailUrl?: string;
    createdAt: string;
    relatedArtifacts: string[];
    color?: string;
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
                    // Seed enrichmentStore from REST response
                    if (json.enrichments?.length) {
                        useEnrichmentStore.getState().setEnrichments(
                            artifactId,
                            (json.enrichments as Array<{
                                id: string;
                                sourceName: string;
                                sourceUrl: string;
                                extractedContent: string;
                                images: Array<{ url: string; caption: string }>;
                                relevanceScore: number;
                                createdAt: string;
                                verified?: boolean | null;
                            }>).map((e) => ({
                                id: e.id,
                                sourceName: e.sourceName,
                                sourceUrl: e.sourceUrl,
                                preview: e.extractedContent,
                                images: e.images,
                                relevanceScore: e.relevanceScore,
                                createdAt: e.createdAt,
                                verified: e.verified,
                            })),
                        );
                    }
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
            onClose();
        } catch {
            setDeleting(false);
        }
    };

    const diagrams = narration?.generatedDiagrams ?? [];
    const accentColor = artifact?.color ?? '#6366f1';

    return (
        <div
            id={`artifact-detail-modal-${artifactId}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="artifact-modal-title"
            style={overlayStyle}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={modalStyle}>
                {/* Header */}
                <div style={headerStyle(accentColor)}>
                    <div style={headerInnerStyle}>
                        <span style={typeBadgeStyle(accentColor)}>{artifact?.type ?? '…'}</span>
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            style={closeButtonStyle}
                        >
                            ✕
                        </button>
                    </div>
                    <h2 id="artifact-modal-title" style={titleStyle}>
                        {loading ? 'Loading…' : (artifact?.summary ?? 'Artifact')}
                    </h2>
                </div>

                {/* Body */}
                <div style={bodyStyle}>
                    {loading && (
                        <div style={loadingStyle}>
                            <div style={spinnerStyle} />
                            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>Loading memory…</span>
                        </div>
                    )}

                    {error && (
                        <p style={errorStyle}>{error}</p>
                    )}

                    {/* Full content */}
                    {!loading && artifact?.fullContent && (
                        <section style={sectionStyle}>
                            <h3 style={sectionTitleStyle}>Content</h3>
                            <p style={contentStyle}>{artifact.fullContent}</p>
                        </section>
                    )}

                    {/* Voice narration summary (from artifact_recall) */}
                    {narration?.summary && (
                        <section style={sectionStyle}>
                            <h3 style={sectionTitleStyle}>Rayan's Summary</h3>
                            <p style={{ ...contentStyle, color: 'rgba(99,102,241,0.9)' }}>{narration.summary}</p>
                        </section>
                    )}

                    {/* Generated diagrams */}
                    {diagrams.length > 0 && (
                        <section style={sectionStyle}>
                            <h3 style={sectionTitleStyle}>Generated Diagrams</h3>
                            <div style={diagramsGridStyle}>
                                {diagrams.map((d, i) => (
                                    <GeneratedDiagramCard key={i} url={d.url} caption={d.caption} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Related artifacts */}
                    {(artifact?.relatedArtifacts.length ?? 0) > 0 && (
                        <section style={sectionStyle}>
                            <h3 style={sectionTitleStyle}>Related Memories</h3>
                            <RelatedArtifacts
                                relatedArtifactIds={artifact!.relatedArtifacts}
                                narrationRelated={narration?.relatedArtifacts ?? []}
                            />
                        </section>
                    )}
                    {(narration?.relatedArtifacts.length ?? 0) > 0 && (artifact?.relatedArtifacts.length ?? 0) === 0 && (
                        <section style={sectionStyle}>
                            <h3 style={sectionTitleStyle}>Related Memories</h3>
                            <RelatedArtifacts
                                relatedArtifactIds={[]}
                                narrationRelated={narration!.relatedArtifacts}
                            />
                        </section>
                    )}

                    {/* T131: Enrichments section — web research from enrichment agent */}
                    {!loading && (
                        <section style={sectionStyle}>
                            <h3 style={sectionTitleStyle}>🔮 Web Enrichments</h3>
                            <EnrichmentPanel artifactId={artifactId} />
                        </section>
                    )}

                    {/* Meta */}
                    {artifact?.createdAt && (
                        <p style={metaStyle}>
                            Captured {new Date(artifact.createdAt).toLocaleDateString(undefined, {
                                month: 'long', day: 'numeric', year: 'numeric',
                            })}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div style={footerStyle}>
                    <button
                        onClick={handleDelete}
                        disabled={deleting || loading}
                        style={deleteButtonStyle}
                        aria-label="Delete artifact"
                    >
                        {deleting ? 'Deleting…' : 'Delete Memory'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: colors.overlay,
    backdropFilter: 'blur(8px)',
    zIndex: zIndex.modal,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    animation: 'fadeIn 0.2s ease',
};

const modalStyle: React.CSSProperties = {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.xl,
    width: '100%',
    maxWidth: 580,
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: shadows.lg,
    animation: 'scaleIn 0.25s ease',
};

const headerStyle = (accent: string): React.CSSProperties => ({
    padding: '20px 20px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: `linear-gradient(135deg, ${accent}18 0%, transparent 60%)`,
    flexShrink: 0,
});

const headerInnerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
};

const typeBadgeStyle = (accent: string): React.CSSProperties => ({
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: accent,
    background: `${accent}22`,
    border: `1px solid ${accent}44`,
    borderRadius: radii.sm,
    padding: '3px 8px',
    fontFamily: fonts.body,
});

const closeButtonStyle: React.CSSProperties = {
    background: colors.surfaceHover,
    border: 'none',
    borderRadius: '50%',
    width: 30,
    height: 30,
    color: colors.textMuted,
    cursor: 'pointer',
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s ease',
};

const titleStyle: React.CSSProperties = {
    color: colors.white,
    fontSize: 18,
    fontWeight: 600,
    fontFamily: fonts.heading,
    margin: 0,
    lineHeight: 1.35,
};

const bodyStyle: React.CSSProperties = {
    overflowY: 'auto',
    padding: '16px 20px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
};

const sectionStyle: React.CSSProperties = {};

const sectionTitleStyle: React.CSSProperties = {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 8,
    marginTop: 0,
    fontFamily: fonts.body,
};

const contentStyle: React.CSSProperties = {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 1.7,
    margin: 0,
    fontFamily: fonts.body,
};

const metaStyle: React.CSSProperties = {
    color: colors.textFaint,
    fontSize: 11,
    fontFamily: fonts.body,
    margin: 0,
};

const diagramsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 10,
};

const footerStyle: React.CSSProperties = {
    padding: '12px 20px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    justifyContent: 'flex-end',
    flexShrink: 0,
};

const deleteButtonStyle: React.CSSProperties = {
    background: colors.errorMuted,
    border: `1px solid ${colors.errorBorder}`,
    borderRadius: radii.md,
    color: colors.error,
    cursor: 'pointer',
    fontSize: 13,
    padding: '7px 14px',
    fontFamily: fonts.body,
    fontWeight: 500,
};

const loadingStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    padding: '32px 0',
};

const spinnerStyle: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: `2.5px solid ${colors.primaryMuted}`,
    borderTopColor: colors.primary,
    animation: 'spin 0.85s linear infinite',
};

const errorStyle: React.CSSProperties = {
    color: colors.error,
    fontSize: 13,
    fontFamily: fonts.body,
    margin: 0,
    padding: '12px 0',
};
