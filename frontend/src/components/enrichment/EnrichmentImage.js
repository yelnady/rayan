import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * EnrichmentImage — a single web-sourced image with caption.
 *
 * T129: Displays an enrichment image with source caption. Used inside
 * EnrichmentPanel for each image in an enrichment data package.
 */
import React from 'react';
import { colors, fonts, radii } from '../../config/tokens';
export function EnrichmentImage({ url, caption }) {
    const [errored, setErrored] = React.useState(false);
    if (errored) {
        return (_jsxs("div", { style: placeholderStyle, children: [_jsx("span", { style: placeholderIconStyle, children: "\uD83D\uDDBC" }), _jsx("span", { style: captionStyle, children: caption })] }));
    }
    return (_jsxs("figure", { style: figureStyle, children: [_jsx("img", { src: url, alt: caption, style: imgStyle, onError: () => setErrored(true), loading: "lazy" }), caption && (_jsx("figcaption", { style: captionStyle, children: caption }))] }));
}
// ── Styles ────────────────────────────────────────────────────────────────────
const figureStyle = {
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
};
const imgStyle = {
    width: '100%',
    aspectRatio: '16/9',
    objectFit: 'cover',
    borderRadius: radii.md,
    background: 'rgba(255,255,255,0.04)',
};
const captionStyle = {
    color: colors.textFaint,
    fontSize: 11,
    fontFamily: fonts.body,
    lineHeight: 1.4,
};
const placeholderStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '20px 12px',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: radii.md,
};
const placeholderIconStyle = {
    fontSize: 28,
};
