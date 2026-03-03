import { useEffect, useState } from 'react';
import { palaceApi } from '../services/palaceApi';
import { usePalaceStore } from '../stores/palaceStore';
import type { Artifact, Room } from '../types/palace';

interface UseRoomReturn {
  room: Room | null;
  artifacts: Artifact[];
  loading: boolean;
  error: string | null;
}

export function useRoom(roomId: string | null): UseRoomReturn {
  const { setArtifacts } = usePalaceStore();
  const [room, setRoom] = useState<Room | null>(null);
  const [artifacts, setLocalArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      setLocalArtifacts([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([palaceApi.getRoom(roomId), palaceApi.accessRoom(roomId)])
      .then(([data]) => {
        if (cancelled) return;
        setRoom(data.room);
        setLocalArtifacts(data.artifacts);
        setArtifacts(roomId, data.artifacts);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load room');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { room, artifacts, loading, error };
}
