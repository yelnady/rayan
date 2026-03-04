import { useEffect, useState } from 'react';
import { palaceApi } from '../services/palaceApi';
import { usePalaceStore } from '../stores/palaceStore';

interface UsePalaceReturn {
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function usePalace(): UsePalaceReturn {
  const { setPalace, setLayout, setRooms, setAllArtifacts, setLoading, setError, loading, error } =
    usePalaceStore();
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    palaceApi
      .getPalace()
      .then((data) => {
        if (cancelled) return;
        setPalace(data.palace);
        setLayout(data.layout);
        setRooms(data.rooms);
        setAllArtifacts(data.artifacts);
      })
      .catch(async (err: unknown) => {
        if (cancelled) return;
        // Palace doesn't exist yet — create it
        if (err instanceof Error && err.message.includes('404')) {
          try {
            const created = await palaceApi.createPalace();
            if (!cancelled) {
              setPalace(created.palace);
              setLayout(null);
              setRooms([]);
            }
          } catch (createErr) {
            if (!cancelled) {
              setError(createErr instanceof Error ? createErr.message : 'Failed to create palace');
            }
          }
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load palace');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [version]); // eslint-disable-line react-hooks/exhaustive-deps

  return { loading, error, reload: () => setVersion((v) => v + 1) };
}
