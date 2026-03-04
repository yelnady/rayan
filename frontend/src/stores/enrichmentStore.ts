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

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EnrichmentImage {
    url: string;
    caption: string;
}

export interface Enrichment {
    id: string;
    sourceName: string;
    sourceUrl: string;
    /** Short preview / extracted content */
    preview: string;
    images: EnrichmentImage[];
    relevanceScore?: number;
    createdAt?: string;
    verified?: boolean | null;
}

interface EnrichmentState {
    /** Map of artifactId → list of enrichments */
    byArtifactId: Record<string, Enrichment[]>;
    /**
     * Set of artifact IDs that received a new enrichment since the user last
     * opened their detail panel. Used to drive the crystal_orb_pulse animation.
     */
    newEnrichmentArtifactIds: Set<string>;

    // ── Actions ─────────────────────────────────────────────────────────────────
    /** Add (or merge) an enrichment for an artifact. */
    addEnrichment: (artifactId: string, enrichment: Enrichment) => void;
    /** Seed the store from a REST response (replaces existing data for that artifact). */
    setEnrichments: (artifactId: string, enrichments: Enrichment[]) => void;
    /** Clear the "new" pulse flag for an artifact (called when user opens the panel). */
    clearNewFlag: (artifactId: string) => void;
    /** Remove all enrichment data (e.g. on sign-out). */
    reset: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useEnrichmentStore = create<EnrichmentState>((set) => ({
    byArtifactId: {},
    newEnrichmentArtifactIds: new Set(),

    addEnrichment: (artifactId, enrichment) =>
        set((state) => {
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

    setEnrichments: (artifactId, enrichments) =>
        set((state) => ({
            byArtifactId: { ...state.byArtifactId, [artifactId]: enrichments },
        })),

    clearNewFlag: (artifactId) =>
        set((state) => {
            const newIds = new Set(state.newEnrichmentArtifactIds);
            newIds.delete(artifactId);
            return { newEnrichmentArtifactIds: newIds };
        }),

    reset: () =>
        set({ byArtifactId: {}, newEnrichmentArtifactIds: new Set() }),
}));
