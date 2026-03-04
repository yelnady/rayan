/**
 * EnrichmentImage — a single web-sourced image with caption.
 *
 * T129: Displays an enrichment image with source caption. Used inside
 * EnrichmentPanel for each image in an enrichment data package.
 */

import React from 'react';
import { colors, fonts, radii } from '../../config/tokens';

interface EnrichmentImageProps {
    url: string;
    caption: string;
}

export function EnrichmentImage({ url, caption }: EnrichmentImageProps) {
    const [errored, setErrored] = React.useState(false);

    if (errored) {
        return (
            <div style={placeholderStyle}>
                <span style={placeholderIconStyle}>🖼</span>
                <span style={captionStyle}>{caption}</span>
            </div>
        );
    }

    return (
        <figure style={figureStyle}>
            <img
                src={url}
                alt={caption}
                style={imgStyle}
                onError={() => setErrored(true)}
                loading="lazy"
            />
            {caption && (
                <figcaption style={captionStyle}>{caption}</figcaption>
            )}
        </figure>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const figureStyle: React.CSSProperties = {
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
};

const imgStyle: React.CSSProperties = {
    width: '100%',
    aspectRatio: '16/9',
    objectFit: 'cover',
    borderRadius: radii.md,
    background: 'rgba(255,255,255,0.04)',
};

const captionStyle: React.CSSProperties = {
    color: colors.textFaint,
    fontSize: 11,
    fontFamily: fonts.body,
    lineHeight: 1.4,
};

const placeholderStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '20px 12px',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: radii.md,
};

const placeholderIconStyle: React.CSSProperties = {
    fontSize: 28,
};
