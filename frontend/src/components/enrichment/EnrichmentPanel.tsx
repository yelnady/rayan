import React from 'react';
import { useEnrichmentStore } from '../../stores/enrichmentStore';
import { EnrichmentImage } from './EnrichmentImage';
import { SourceAttribution } from './SourceAttribution';

interface EnrichmentPanelProps {
    artifactId: string;
}

const EMPTY_ENRICHMENTS: never[] = [];

export function EnrichmentPanel({ artifactId }: EnrichmentPanelProps) {
    const enrichments = useEnrichmentStore(
        (s) => s.byArtifactId[artifactId] ?? EMPTY_ENRICHMENTS,
    );
    const clearNewFlag = useEnrichmentStore((s) => s.clearNewFlag);

    React.useEffect(() => {
        clearNewFlag(artifactId);
    }, [artifactId, clearNewFlag]);

    if (enrichments.length === 0) {
        return (
            <div className="flex flex-col items-center gap-2.5 py-6">
                <span className="text-[32px] opacity-50 animate-[pulse_2s_ease-in-out_infinite]">🔮</span>
                <p className="text-text-faint text-[13px] font-body m-0 text-center">
                    Web enrichment in progress… Check back shortly.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {enrichments.map((e) => (
                <div key={e.id} className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-md p-3.5 flex flex-col gap-2.5 shadow-sm">
                    {/* Card header */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <SourceAttribution url={e.sourceUrl} sourceName={e.sourceName} />
                        {typeof e.relevanceScore === 'number' && (
                            <span
                                className={`text-[10px] font-body font-semibold rounded-sm px-1.5 py-0.5 border ${e.relevanceScore >= 0.7
                                        ? 'text-[#34d399] bg-[rgba(52,211,153,0.1)] border-[rgba(52,211,153,0.3)]'
                                        : e.relevanceScore >= 0.5
                                            ? 'text-[#fbbf24] bg-[rgba(251,191,36,0.1)] border-[rgba(251,191,36,0.3)]'
                                            : 'text-text-faint bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)]'
                                    }`}
                            >
                                {Math.round(e.relevanceScore * 100)}% relevant
                            </span>
                        )}
                    </div>

                    {/* Preview text */}
                    <p className="text-text-secondary text-[13px] leading-[1.65] m-0 font-body">{e.preview}</p>

                    {/* Images */}
                    {e.images.length > 0 && (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
                            {e.images.map((img, i) => (
                                <EnrichmentImage key={i} url={img.url} caption={img.caption} />
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
