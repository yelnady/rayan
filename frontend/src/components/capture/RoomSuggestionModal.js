import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useCaptureStore } from '../../stores/captureStore';
import { colors, fonts, radii, shadows } from '../../config/tokens';
export function RoomSuggestionModal() {
    const roomSuggestion = useCaptureStore((s) => s.roomSuggestion);
    const resolver = useCaptureStore((s) => s.roomSuggestionResolver);
    const setRoomSuggestion = useCaptureStore((s) => s.setRoomSuggestion);
    const [editedName, setEditedName] = useState('');
    const [editedStyle, setEditedStyle] = useState('library');
    const [isEditing, setIsEditing] = useState(false);
    if (!roomSuggestion)
        return null;
    const { suggestion } = roomSuggestion;
    const suggestedName = suggestion.room.name;
    const isNew = suggestion.action === 'create_new';
    function resolve(choice) {
        resolver?.(choice);
        setRoomSuggestion(null);
        setIsEditing(false);
    }
    return (_jsx("div", { style: {
            position: 'fixed',
            inset: 0,
            background: colors.overlay,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.2s ease',
        }, children: _jsxs("div", { style: {
                background: colors.surfaceAlt,
                borderRadius: radii.lg,
                padding: '28px 36px',
                color: colors.white,
                minWidth: 380,
                maxWidth: 500,
                border: `1px solid ${colors.border}`,
                boxShadow: shadows.lg,
                animation: 'scaleIn 0.25s ease',
            }, children: [_jsx("h3", { style: { margin: '0 0 8px', fontSize: 18, fontFamily: fonts.heading }, children: isNew ? '🏗 Create New Room?' : '📍 Assign to Room?' }), _jsx("p", { style: { margin: '0 0 16px', color: colors.textSecondary, fontSize: 14, fontFamily: fonts.body }, children: suggestion.room.reason }), !isEditing ? (_jsxs(_Fragment, { children: [_jsxs("div", { style: {
                                background: colors.surfaceHover,
                                borderRadius: radii.md,
                                padding: '14px 18px',
                                marginBottom: 16,
                                border: `1px solid ${colors.borderLight}`,
                            }, children: [_jsx("div", { style: { fontWeight: 700, fontSize: 15, fontFamily: fonts.body }, children: suggestedName }), _jsxs("div", { style: { color: colors.textMuted, fontSize: 13, marginTop: 4, fontFamily: fonts.body }, children: ["Style: ", suggestion.room.style, " \u00B7 Keywords:", ' ', suggestion.room.keywords.slice(0, 3).join(', ')] })] }), suggestion.alternatives.length > 0 && (_jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("div", { style: { fontSize: 12, color: colors.textMuted, marginBottom: 8, fontFamily: fonts.body }, children: "Alternatives:" }), suggestion.alternatives.map((alt) => (_jsxs("button", { onClick: () => resolve({ action: 'accept' }), style: {
                                        display: 'block',
                                        width: '100%',
                                        textAlign: 'left',
                                        background: colors.surfaceHover,
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: radii.md,
                                        padding: '8px 12px',
                                        color: colors.white,
                                        cursor: 'pointer',
                                        marginBottom: 6,
                                        fontSize: 13,
                                        fontFamily: fonts.body,
                                    }, children: [alt.name, ' ', _jsxs("span", { style: { color: colors.textMuted }, children: ["(", Math.round(alt.similarity * 100), "% match)"] })] }, alt.room_id)))] })), _jsxs("div", { style: { display: 'flex', gap: 10 }, children: [_jsx("button", { onClick: () => resolve({ action: 'accept' }), style: btnStyle(colors.primary), children: "Accept" }), _jsx("button", { onClick: () => {
                                        setEditedName(suggestedName);
                                        setEditedStyle(suggestion.room.style);
                                        setIsEditing(true);
                                    }, style: btnStyle('rgba(255,255,255,0.1)'), children: "Edit" }), _jsx("button", { onClick: () => resolve({ action: 'reject' }), style: btnStyle(colors.errorMuted.replace('0.12', '0.25')), children: "Reject" })] })] })) : (_jsxs(_Fragment, { children: [_jsx("input", { value: editedName, onChange: (e) => setEditedName(e.target.value), placeholder: "Room name", style: inputStyle }), _jsx("select", { value: editedStyle, onChange: (e) => setEditedStyle(e.target.value), style: { ...inputStyle, marginTop: 10 }, children: ['library', 'lab', 'gallery', 'garden', 'workshop'].map((s) => (_jsx("option", { value: s, children: s }, s))) }), _jsxs("div", { style: { display: 'flex', gap: 10, marginTop: 16 }, children: [_jsx("button", { onClick: () => resolve({ action: 'edit', editedName, editedStyle }), style: btnStyle(colors.primary), children: "Confirm" }), _jsx("button", { onClick: () => setIsEditing(false), style: btnStyle('rgba(255,255,255,0.1)'), children: "Back" })] })] }))] }) }));
}
const btnStyle = (bg) => ({
    flex: 1,
    background: bg,
    color: colors.white,
    border: 'none',
    borderRadius: radii.md,
    padding: '10px 0',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
    fontFamily: fonts.body,
    transition: 'opacity 0.15s ease',
});
const inputStyle = {
    width: '100%',
    background: colors.surfaceHover,
    border: `1px solid ${colors.borderLight}`,
    borderRadius: radii.md,
    padding: '10px 12px',
    color: colors.white,
    fontSize: 14,
    boxSizing: 'border-box',
    fontFamily: fonts.body,
};
