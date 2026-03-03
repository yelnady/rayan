import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useCaptureStore } from '../../stores/captureStore';
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
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
        }, children: _jsxs("div", { style: {
                background: '#1e1e2e',
                borderRadius: 16,
                padding: '28px 36px',
                color: '#fff',
                minWidth: 380,
                maxWidth: 500,
            }, children: [_jsx("h3", { style: { margin: '0 0 8px', fontSize: 18 }, children: isNew ? '🏗 Create New Room?' : '📍 Assign to Room?' }), _jsx("p", { style: { margin: '0 0 16px', opacity: 0.75, fontSize: 14 }, children: suggestion.room.reason }), !isEditing ? (_jsxs(_Fragment, { children: [_jsxs("div", { style: {
                                background: 'rgba(255,255,255,0.07)',
                                borderRadius: 10,
                                padding: '14px 18px',
                                marginBottom: 16,
                            }, children: [_jsx("div", { style: { fontWeight: 700, fontSize: 16 }, children: suggestedName }), _jsxs("div", { style: { opacity: 0.6, fontSize: 13, marginTop: 4 }, children: ["Style: ", suggestion.room.style, " \u00B7 Keywords:", ' ', suggestion.room.keywords.slice(0, 3).join(', ')] })] }), suggestion.alternatives.length > 0 && (_jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("div", { style: { fontSize: 12, opacity: 0.6, marginBottom: 8 }, children: "Alternatives:" }), suggestion.alternatives.map((alt) => (_jsxs("button", { onClick: () => resolve({ action: 'accept' }), style: {
                                        display: 'block',
                                        width: '100%',
                                        textAlign: 'left',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: 8,
                                        padding: '8px 12px',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        marginBottom: 6,
                                        fontSize: 13,
                                    }, children: [alt.name, ' ', _jsxs("span", { style: { opacity: 0.5 }, children: ["(", Math.round(alt.similarity * 100), "% match)"] })] }, alt.room_id)))] })), _jsxs("div", { style: { display: 'flex', gap: 10 }, children: [_jsx("button", { onClick: () => resolve({ action: 'accept' }), style: btnStyle('#1976d2'), children: "Accept" }), _jsx("button", { onClick: () => {
                                        setEditedName(suggestedName);
                                        setEditedStyle(suggestion.room.style);
                                        setIsEditing(true);
                                    }, style: btnStyle('#555'), children: "Edit" }), _jsx("button", { onClick: () => resolve({ action: 'reject' }), style: btnStyle('#c62828'), children: "Reject" })] })] })) : (_jsxs(_Fragment, { children: [_jsx("input", { value: editedName, onChange: (e) => setEditedName(e.target.value), placeholder: "Room name", style: inputStyle }), _jsx("select", { value: editedStyle, onChange: (e) => setEditedStyle(e.target.value), style: { ...inputStyle, marginTop: 10 }, children: ['library', 'lab', 'gallery', 'garden', 'workshop'].map((s) => (_jsx("option", { value: s, children: s }, s))) }), _jsxs("div", { style: { display: 'flex', gap: 10, marginTop: 16 }, children: [_jsx("button", { onClick: () => resolve({ action: 'edit', editedName, editedStyle }), style: btnStyle('#1976d2'), children: "Confirm" }), _jsx("button", { onClick: () => setIsEditing(false), style: btnStyle('#555'), children: "Back" })] })] }))] }) }));
}
const btnStyle = (bg) => ({
    flex: 1,
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 0',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
});
const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: '10px 12px',
    color: '#fff',
    fontSize: 14,
    boxSizing: 'border-box',
};
