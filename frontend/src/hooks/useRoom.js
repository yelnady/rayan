import { useEffect, useState } from 'react';
import { palaceApi } from '../services/palaceApi';
import { usePalaceStore } from '../stores/palaceStore';
export function useRoom(roomId) {
    const { setArtifacts } = usePalaceStore();
    const [room, setRoom] = useState(null);
    const [artifacts, setLocalArtifacts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
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
            if (cancelled)
                return;
            setRoom(data.room);
            setLocalArtifacts(data.artifacts);
            setArtifacts(roomId, data.artifacts);
        })
            .catch((err) => {
            if (!cancelled) {
                setError(err instanceof Error ? err.message : 'Failed to load room');
            }
        })
            .finally(() => {
            if (!cancelled)
                setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps
    return { room, artifacts, loading, error };
}
