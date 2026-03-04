import { useState } from 'react';
import { useCaptureStore } from '../../stores/captureStore';
import type { RoomSuggestionChoice } from '../../stores/captureStore';
import { colors, fonts, radii, shadows } from '../../config/tokens';

export function RoomSuggestionModal() {
  const roomSuggestion = useCaptureStore((s) => s.roomSuggestion);
  const resolver = useCaptureStore((s) => s.roomSuggestionResolver);
  const setRoomSuggestion = useCaptureStore((s) => s.setRoomSuggestion);

  const [editedName, setEditedName] = useState('');
  const [editedStyle, setEditedStyle] = useState('library');
  const [isEditing, setIsEditing] = useState(false);

  if (!roomSuggestion) return null;

  const { suggestion } = roomSuggestion;
  const suggestedName = suggestion.room.name;
  const isNew = suggestion.action === 'create_new';

  function resolve(choice: RoomSuggestionChoice) {
    resolver?.(choice);
    setRoomSuggestion(null);
    setIsEditing(false);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: colors.overlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1300,
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        style={{
          background: colors.surfaceAlt,
          borderRadius: radii.lg,
          padding: '28px 36px',
          color: colors.white,
          minWidth: 380,
          maxWidth: 500,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.lg,
          animation: 'scaleIn 0.25s ease',
        }}
      >
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontFamily: fonts.heading }}>
          {isNew ? '🏗 Create New Room?' : '📍 Assign to Room?'}
        </h3>

        <p style={{ margin: '0 0 16px', color: colors.textSecondary, fontSize: 14, fontFamily: fonts.body }}>
          {suggestion.room.reason}
        </p>

        {!isEditing ? (
          <>
            <div
              style={{
                background: colors.surfaceHover,
                borderRadius: radii.md,
                padding: '14px 18px',
                marginBottom: 16,
                border: `1px solid ${colors.borderLight}`,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 15, fontFamily: fonts.body }}>{suggestedName}</div>
              <div style={{ color: colors.textMuted, fontSize: 13, marginTop: 4, fontFamily: fonts.body }}>
                Style: {suggestion.room.style} · Keywords:{' '}
                {suggestion.room.keywords.slice(0, 3).join(', ')}
              </div>
            </div>

            {suggestion.alternatives.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8, fontFamily: fonts.body }}>
                  Alternatives:
                </div>
                {suggestion.alternatives.map((alt) => (
                  <button
                    key={alt.room_id}
                    onClick={() => resolve({ action: 'accept' })}
                    style={{
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
                    }}
                  >
                    {alt.name}{' '}
                    <span style={{ color: colors.textMuted }}>
                      ({Math.round(alt.similarity * 100)}% match)
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => resolve({ action: 'accept' })}
                style={btnStyle(colors.primary)}
              >
                Accept
              </button>
              <button
                onClick={() => {
                  setEditedName(suggestedName);
                  setEditedStyle(suggestion.room.style);
                  setIsEditing(true);
                }}
                style={btnStyle('rgba(255,255,255,0.1)')}
              >
                Edit
              </button>
              <button onClick={() => resolve({ action: 'reject' })} style={btnStyle(colors.errorMuted.replace('0.12', '0.25'))}>
                Reject
              </button>
            </div>
          </>
        ) : (
          <>
            <input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              placeholder="Room name"
              style={inputStyle}
            />
            <select
              value={editedStyle}
              onChange={(e) => setEditedStyle(e.target.value)}
              style={{ ...inputStyle, marginTop: 10 }}
            >
              {['library', 'lab', 'gallery', 'garden', 'workshop'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                onClick={() =>
                  resolve({ action: 'edit', editedName, editedStyle })
                }
                style={btnStyle(colors.primary)}
              >
                Confirm
              </button>
              <button onClick={() => setIsEditing(false)} style={btnStyle('rgba(255,255,255,0.1)')}>
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div >
  );
}

const btnStyle = (bg: string): React.CSSProperties => ({
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

const inputStyle: React.CSSProperties = {
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
