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
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-[1300] backdrop-blur-sm animate-[fadeIn_0.2s_ease]">
      <div className="bg-surface-alt rounded-2xl py-7 px-9 text-text-primary min-w-[380px] max-w-[500px] border border-border shadow-lg animate-[scaleIn_0.25s_ease]">
        <h3 className="m-0 mb-2 text-lg font-heading">
          {isNew ? '🏗 Create New Room?' : '📍 Assign to Room?'}
        </h3>

        <p className="m-0 mb-4 text-text-secondary text-sm font-body">
          {suggestion.room.reason}
        </p>

        {!isEditing ? (
          <>
            <div className="bg-surface-hover rounded-md py-3.5 px-4.5 mb-4 border border-border-light">
              <div className="font-bold text-[15px] font-body">{suggestedName}</div>
              <div className="text-text-muted text-[13px] mt-1 font-body">
                Style: {suggestion.room.style} · Keywords:{' '}
                {suggestion.room.keywords.slice(0, 3).join(', ')}
              </div>
            </div>

            {suggestion.alternatives.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-text-muted mb-2 font-body">
                  Alternatives:
                </div>
                {suggestion.alternatives.map((alt) => (
                  <button
                    key={alt.room_id}
                    onClick={() => resolve({ action: 'accept' })}
                    className="block w-full text-left bg-surface-hover border border-border rounded-md px-3 py-2 text-text-primary cursor-pointer mb-1.5 text-[13px] font-body"
                  >
                    {alt.name}{' '}
                    <span className="text-text-secondary">
                      ({Math.round(alt.similarity * 100)}% match)
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2.5">
              <button
                onClick={() => resolve({ action: 'accept' })}
                className="flex-1 bg-primary text-text-primary border-none rounded-md py-2.5 cursor-pointer font-semibold text-sm font-body transition-opacity duration-150 hover:opacity-90"
              >
                Accept
              </button>
              <button
                onClick={() => {
                  setEditedName(suggestedName);
                  setEditedStyle(suggestion.room.style);
                  setIsEditing(true);
                }}
                className="flex-1 bg-[rgba(0,0,0,0.05)] text-text-primary border-none rounded-md py-2.5 cursor-pointer font-semibold text-sm font-body transition-opacity duration-150 hover:opacity-90"
              >
                Edit
              </button>
              <button
                onClick={() => resolve({ action: 'reject' })}
                className="flex-1 bg-[rgba(239,68,68,0.25)] text-text-primary border-none rounded-md py-2.5 cursor-pointer font-semibold text-sm font-body transition-opacity duration-150 hover:opacity-90"
              >
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
              className="w-full bg-surface-hover border border-border-light rounded-md py-2.5 px-3 text-text-primary text-sm box-border font-body"
            />
            <select
              value={editedStyle}
              onChange={(e) => setEditedStyle(e.target.value)}
              className="w-full bg-surface-hover border border-border-light rounded-md py-2.5 px-3 text-text-primary text-sm box-border font-body mt-2.5"
            >
              {['library', 'lab', 'gallery', 'garden', 'workshop'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <div className="flex gap-2.5 mt-4">
              <button
                onClick={() =>
                  resolve({ action: 'edit', editedName, editedStyle })
                }
                className="flex-1 bg-primary text-text-primary border-none rounded-md py-2.5 cursor-pointer font-semibold text-sm font-body transition-opacity duration-150 hover:opacity-90"
              >
                Confirm
              </button>
              <button onClick={() => setIsEditing(false)} className="flex-1 bg-[rgba(0,0,0,0.05)] text-text-primary border-none rounded-md py-2.5 cursor-pointer font-semibold text-sm font-body transition-opacity duration-150 hover:opacity-90">
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div >
  );
}
