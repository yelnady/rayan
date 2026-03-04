import React from 'react';

interface SourceAttributionProps {
    url: string;
    sourceName: string;
}

export function SourceAttribution({ url, sourceName }: SourceAttributionProps) {
    const domain = React.useMemo(() => {
        try {
            return new URL(url).hostname.replace(/^www\./, '');
        } catch {
            return sourceName || url;
        }
    }, [url, sourceName]);

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-[5px] text-primary text-[11px] font-body no-underline bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] rounded-sm py-[3px] px-2 transition-colors duration-150 hover:bg-[rgba(99,102,241,0.2)]"
            title={url}
        >
            <span className="text-[10px]">🔗</span>
            <span className="font-medium">{domain}</span>
            <span className="text-[10px] opacity-70">↗</span>
        </a>
    );
}
