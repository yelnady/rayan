import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * SourceAttribution — renders a clickable source link with domain name.
 *
 * T130: Used inside EnrichmentPanel to credit the web source of enrichment data.
 */
import React from 'react';
import { colors, fonts, radii } from '../../config/tokens';
export function SourceAttribution({ url, sourceName }) {
    const domain = React.useMemo(() => {
        try {
            return new URL(url).hostname.replace(/^www\./, '');
        }
        catch {
            return sourceName || url;
        }
    }, [url, sourceName]);
    return (_jsxs("a", { href: url, target: "_blank", rel: "noopener noreferrer", style: linkStyle, title: url, children: [_jsx("span", { style: iconStyle, children: "\uD83D\uDD17" }), _jsx("span", { style: textStyle, children: domain }), _jsx("span", { style: arrowStyle, children: "\u2197" })] }));
}
// ── Styles ────────────────────────────────────────────────────────────────────
const linkStyle = {
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
const iconStyle = {
    fontSize: 10,
};
const textStyle = {
    fontWeight: 500,
};
const arrowStyle = {
    fontSize: 10,
    opacity: 0.7,
};
