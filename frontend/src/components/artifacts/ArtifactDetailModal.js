import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { useEffect, useState } from 'react';
import { useVoiceStore } from '../../stores/voiceStore';
import { useEnrichmentStore } from '../../stores/enrichmentStore';
import { RelatedArtifacts } from './RelatedArtifacts';
import { GeneratedDiagramCard } from '../voice/GeneratedDiagram';
import { EnrichmentPanel } from '../enrichment/EnrichmentPanel';
import { API_BASE_URL } from '../../config/api';
import { useAuthStore } from '../../stores/authStore';
import { colors, fonts, radii, shadows, zIndex } from '../../config/tokens';
export function ArtifactDetailModal({ artifactId, onClose }) {
    const [artifact, setArtifact] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const narration = useVoiceStore((s) => s.currentNarration);
    const { user } = useAuthStore();
    // ── Fetch full artifact details from REST API ───────────────────────────────
    useEffect(() => {
        if (!user)
            return;
        let cancelled = false;
        const fetchArtifact = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = await user.getIdToken();
                const res = await fetch(`${API_BASE_URL}/artifacts/${artifactId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok)
                    throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                if (!cancelled) {
                    setArtifact(json.artifact);
                    // Seed enrichmentStore from REST response
                    if (json.enrichments?.length) {
                        useEnrichmentStore.getState().setEnrichments(artifactId, json.enrichments.map((e) => ({
                            id: e.id,
                            sourceName: e.sourceName,
                            sourceUrl: e.sourceUrl,
                            preview: e.extractedContent,
                            images: e.images,
                            relevanceScore: e.relevanceScore,
                            createdAt: e.createdAt,
                            verified: e.verified,
                        })));
                    }
                }
            }
            catch (err) {
                if (!cancelled)
                    setError(err instanceof Error ? err.message : 'Failed to load artifact');
            }
            finally {
                if (!cancelled)
                    setLoading(false);
            }
        };
        void fetchArtifact();
        return () => { cancelled = true; };
    }, [artifactId, user]);
    // ── Delete handler ──────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!user || deleting)
            return;
        if (!window.confirm('Delete this memory artifact? This cannot be undone.'))
            return;
        setDeleting(true);
        try {
            const token = await user.getIdToken();
            await fetch(`${API_BASE_URL}/artifacts/${artifactId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            onClose();
        }
        catch {
            setDeleting(false);
        }
    };
    const diagrams = narration?.generatedDiagrams ?? [];
    const accentColor = artifact?.color ?? '#6366f1';
    return (_jsx("div", { id: `artifact-detail-modal-${artifactId}`, role: "dialog", "aria-modal": "true", "aria-labelledby": "artifact-modal-title", style: overlayStyle, onClick: (e) => { if (e.target === e.currentTarget)
            onClose(); }, children: _jsxs("div", { style: modalStyle, children: [_jsxs("div", { style: headerStyle(accentColor), children: [_jsxs("div", { style: headerInnerStyle, children: [_jsx("span", { style: typeBadgeStyle(accentColor), children: artifact?.type ?? '…' }), _jsx("button", { onClick: onClose, "aria-label": "Close", style: closeButtonStyle, children: "\u2715" })] }), _jsx("h2", { id: "artifact-modal-title", style: titleStyle, children: loading ? 'Loading…' : (artifact?.summary ?? 'Artifact') })] }), _jsxs("div", { style: bodyStyle, children: [loading && (_jsxs("div", { style: loadingStyle, children: [_jsx("div", { style: spinnerStyle }), _jsx("span", { style: { color: 'rgba(255,255,255,0.45)', fontSize: 13 }, children: "Loading memory\u2026" })] })), error && (_jsx("p", { style: errorStyle, children: error })), !loading && artifact?.fullContent && (_jsxs("section", { style: sectionStyle, children: [_jsx("h3", { style: sectionTitleStyle, children: "Content" }), _jsx("p", { style: contentStyle, children: artifact.fullContent })] })), narration?.summary && (_jsxs("section", { style: sectionStyle, children: [_jsx("h3", { style: sectionTitleStyle, children: "Rayan's Summary" }), _jsx("p", { style: { ...contentStyle, color: 'rgba(99,102,241,0.9)' }, children: narration.summary })] })), diagrams.length > 0 && (_jsxs("section", { style: sectionStyle, children: [_jsx("h3", { style: sectionTitleStyle, children: "Generated Diagrams" }), _jsx("div", { style: diagramsGridStyle, children: diagrams.map((d, i) => (_jsx(GeneratedDiagramCard, { url: d.url, caption: d.caption }, i))) })] })), (artifact?.relatedArtifacts.length ?? 0) > 0 && (_jsxs("section", { style: sectionStyle, children: [_jsx("h3", { style: sectionTitleStyle, children: "Related Memories" }), _jsx(RelatedArtifacts, { relatedArtifactIds: artifact.relatedArtifacts, narrationRelated: narration?.relatedArtifacts ?? [] })] })), (narration?.relatedArtifacts.length ?? 0) > 0 && (artifact?.relatedArtifacts.length ?? 0) === 0 && (_jsxs("section", { style: sectionStyle, children: [_jsx("h3", { style: sectionTitleStyle, children: "Related Memories" }), _jsx(RelatedArtifacts, { relatedArtifactIds: [], narrationRelated: narration.relatedArtifacts })] })), !loading && (_jsxs("section", { style: sectionStyle, children: [_jsx("h3", { style: sectionTitleStyle, children: "\uD83D\uDD2E Web Enrichments" }), _jsx(EnrichmentPanel, { artifactId: artifactId })] })), artifact?.createdAt && (_jsxs("p", { style: metaStyle, children: ["Captured ", new Date(artifact.createdAt).toLocaleDateString(undefined, {
                                    month: 'long', day: 'numeric', year: 'numeric',
                                })] }))] }), _jsx("div", { style: footerStyle, children: _jsx("button", { onClick: handleDelete, disabled: deleting || loading, style: deleteButtonStyle, "aria-label": "Delete artifact", children: deleting ? 'Deleting…' : 'Delete Memory' }) })] }) }));
}
// ── Styles ────────────────────────────────────────────────────────────────────
const overlayStyle = {
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
const modalStyle = {
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
const headerStyle = (accent) => ({
    padding: '20px 20px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: `linear-gradient(135deg, ${accent}18 0%, transparent 60%)`,
    flexShrink: 0,
});
const headerInnerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
};
const typeBadgeStyle = (accent) => ({
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
const closeButtonStyle = {
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
const titleStyle = {
    color: colors.white,
    fontSize: 18,
    fontWeight: 600,
    fontFamily: fonts.heading,
    margin: 0,
    lineHeight: 1.35,
};
const bodyStyle = {
    overflowY: 'auto',
    padding: '16px 20px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
};
const sectionStyle = {};
const sectionTitleStyle = {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 8,
    marginTop: 0,
    fontFamily: fonts.body,
};
const contentStyle = {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 1.7,
    margin: 0,
    fontFamily: fonts.body,
};
const metaStyle = {
    color: colors.textFaint,
    fontSize: 11,
    fontFamily: fonts.body,
    margin: 0,
};
const diagramsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 10,
};
const footerStyle = {
    padding: '12px 20px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    justifyContent: 'flex-end',
    flexShrink: 0,
};
const deleteButtonStyle = {
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
const loadingStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    padding: '32px 0',
};
const spinnerStyle = {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: `2.5px solid ${colors.primaryMuted}`,
    borderTopColor: colors.primary,
    animation: 'spin 0.85s linear infinite',
};
const errorStyle = {
    color: colors.error,
    fontSize: 13,
    fontFamily: fonts.body,
    margin: 0,
    padding: '12px 0',
};
