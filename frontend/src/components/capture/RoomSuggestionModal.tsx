import { useState } from 'react';
import { useCaptureStore } from '../../stores/captureStore';
import type { RoomSuggestionChoice } from '../../stores/captureStore';

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
        background: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1300,
      }}
    >
      <div
        style={{
          background: '#1e1e2e',
          borderRadius: 16,
          padding: '28px 36px',
          color: '#fff',
          minWidth: 380,
          maxWidth: 500,
        }}
      >
        <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>
          {isNew ? '🏗 Create New Room?' : '📍 Assign to Room?'}
        </h3>

        <p style={{ margin: '0 0 16px', opacity: 0.75, fontSize: 14 }}>
          {suggestion.room.reason}
        </p>

        {!isEditing ? (
          <>
            <div
              style={{
                background: 'rgba(255,255,255,0.07)',
                borderRadius: 10,
                padding: '14px 18px',
                marginBottom: 16,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 16 }}>{suggestedName}</div>
              <div style={{ opacity: 0.6, fontSize: 13, marginTop: 4 }}>
                Style: {suggestion.room.style} · Keywords:{' '}
                {suggestion.room.keywords.slice(0, 3).join(', ')}
              </div>
            </div>

            {suggestion.alternatives.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}>
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
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      padding: '8px 12px',
                      color: '#fff',
                      cursor: 'pointer',
                      marginBottom: 6,
                      fontSize: 13,
                    }}
                  >
                    {alt.name}{' '}
                    <span style={{ opacity: 0.5 }}>
                      ({Math.round(alt.similarity * 100)}% match)
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => resolve({ action: 'accept' })}
                style={btnStyle('#1976d2')}
              >
                Accept
              </button>
              <button
                onClick={() => {
                  setEditedName(suggestedName);
                  setEditedStyle(suggestion.room.style);
                  setIsEditing(true);
                }}
                style={btnStyle('#555')}
              >
                Edit
              </button>
              <button onClick={() => resolve({ action: 'reject' })} style={btnStyle('#c62828')}>
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
                style={btnStyle('#1976d2')}
              >
                Confirm
              </button>
              <button onClick={() => setIsEditing(false)} style={btnStyle('#555')}>
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const btnStyle = (bg: string): React.CSSProperties => ({
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

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 8,
  padding: '10px 12px',
  color: '#fff',
  fontSize: 14,
  boxSizing: 'border-box',
};
