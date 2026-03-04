/**
 * Enrichment store — Zustand state for web enrichment data.
 *
 * T125: Tracks enrichments keyed by artifactId.
 *
 * Populated by:
 *   - WebSocket: enrichment_update messages (T126)
 *   - REST: GET /artifacts/{id} response.enrichments array
 *
 * Consumed by:
 *   - EnrichmentPanel component (T128)
 *   - CrystalOrb component — pulsing flag (T127)
 *   - ArtifactDetailModal (T131)
 */
import { create } from 'zustand';
// ── Store ─────────────────────────────────────────────────────────────────────
export const useEnrichmentStore = create((set) => ({
    byArtifactId: {},
    newEnrichmentArtifactIds: new Set(),
    addEnrichment: (artifactId, enrichment) => set((state) => {
        const existing = state.byArtifactId[artifactId] ?? [];
        // Avoid duplicate IDs
        const merged = [
            ...existing.filter((e) => e.id !== enrichment.id),
            enrichment,
        ];
        const newIds = new Set(state.newEnrichmentArtifactIds);
        newIds.add(artifactId);
        return {
            byArtifactId: { ...state.byArtifactId, [artifactId]: merged },
            newEnrichmentArtifactIds: newIds,
        };
    }),
    setEnrichments: (artifactId, enrichments) => set((state) => ({
        byArtifactId: { ...state.byArtifactId, [artifactId]: enrichments },
    })),
    clearNewFlag: (artifactId) => set((state) => {
        const newIds = new Set(state.newEnrichmentArtifactIds);
        newIds.delete(artifactId);
        return { newEnrichmentArtifactIds: newIds };
    }),
    reset: () => set({ byArtifactId: {}, newEnrichmentArtifactIds: new Set() }),
}));
