import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MediaCapture } from '../services/mediaCapture';
import { AudioStreamer } from '../services/audioCapture';
import { useCaptureStore } from '../stores/captureStore';
import { useWS } from './useWS';
import type { RoomSuggestionChoice } from '../stores/captureStore';

import { stopVoiceSession } from './useVoice';

let _captureInstance: MediaCapture | null = null;
let _audioStreamer: AudioStreamer | null = null;

/** Standalone stop function to be called from other hooks to ensure exclusivity. */
export function stopCapture() {
  const { sessionId, status } = useCaptureStore.getState();
  if (!sessionId || status === 'idle' || status === 'complete') return;

  _captureInstance?.stop();
  _captureInstance = null;

  _audioStreamer?.stop();
  _audioStreamer = null;

  useCaptureStore.getState().setStatus('processing');
  useCaptureStore.getState().setActiveStream(null);
}

export function useCapture() {
  const ws = useWS();
  const store = useCaptureStore();

  const startCapture = useCallback(
    async (source: 'webcam' | 'screen_share' | 'voice' = 'webcam') => {
      if (store.status === 'capturing') return;

      // Ensure mutual exclusivity
      stopVoiceSession();

      const sessionId = uuidv4();
      store.reset();
      store.setSessionId(sessionId);
      store.setSourceType(source);
      store.setStatus('capturing');

      // Notify backend
      ws.sendCaptureStart(sessionId, source);

      // Start local media recording for visual sources (webcam, screen share)
      if (source !== 'voice') {
        const capture = new MediaCapture();
        _captureInstance = capture;

        await capture.start({
          source,
          onChunk: (data, index, timestamp) => {
            ws.sendMediaChunk(sessionId, index, data, timestamp);
          },
          onError: (err) => {
            store.setError(err.message);
            store.setStatus('error');
          },
        });

        // Save stream to store so UI can render the floating preview
        store.setActiveStream(capture.getStream());
      }
      // Start audio streamer for real-time voice interaction with Rayan
      const streamer = new AudioStreamer();
      _audioStreamer = streamer;
      await streamer.start((base64Pcm) => {
        ws.sendCaptureVoiceChunk(sessionId, base64Pcm);
      });

    },
    [ws, store],
  );

  const handleStop = useCallback(() => {
    const { sessionId } = useCaptureStore.getState();
    if (!sessionId) return;

    _captureInstance?.stop();
    _captureInstance = null;

    _audioStreamer?.stop();
    _audioStreamer = null;

    ws.sendCaptureEnd(sessionId);
    store.setStatus('processing');
    store.setActiveStream(null);
  }, [ws, store]);

  /** Returns a promise that resolves when the user responds to the modal. */
  const waitForRoomSuggestionResponse = useCallback(
    (): Promise<RoomSuggestionChoice> =>
      new Promise((resolve) => {
        const { roomSuggestion } = useCaptureStore.getState();
        if (!roomSuggestion) {
          resolve({ action: 'accept' });
          return;
        }
        store.setRoomSuggestion(roomSuggestion, resolve);
      }),
    [store],
  );

  return { startCapture, stopCapture: handleStop, waitForRoomSuggestionResponse };
}
