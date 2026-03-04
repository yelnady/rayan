/**
 * SourceAttribution — renders a clickable source link with domain name.
 *
 * T130: Used inside EnrichmentPanel to credit the web source of enrichment data.
 */

import React from 'react';
import { colors, fonts, radii } from '../../config/tokens';

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
            style={linkStyle}
            title={url}
        >
            <span style={iconStyle}>🔗</span>
            <span style={textStyle}>{domain}</span>
            <span style={arrowStyle}>↗</span>
        </a>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const linkStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    color: colors.primary,
    fontSize: 11,
    fontFamily: fonts.body,
    textDecoration: 'none',
    background: 'rgba(99,102,241,0.1)',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: radii.sm,
    padding: '3px 8px',
    transition: 'background 0.15s ease',
};

const iconStyle: React.CSSProperties = {
    fontSize: 10,
};

const textStyle: React.CSSProperties = {
    fontWeight: 500,
};

const arrowStyle: React.CSSProperties = {
    fontSize: 10,
    opacity: 0.7,
};
