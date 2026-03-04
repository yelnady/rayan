import { useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MediaCapture } from '../services/mediaCapture';
import { useCaptureStore } from '../stores/captureStore';
import { useWS } from './useWS';
export function useCapture() {
    const captureRef = useRef(null);
    const ws = useWS();
    const store = useCaptureStore();
    const startCapture = useCallback(async (source = 'webcam') => {
        if (store.status === 'capturing')
            return;
        const sessionId = uuidv4();
        store.reset();
        store.setSessionId(sessionId);
        store.setSourceType(source);
        store.setStatus('capturing');
        // Notify backend
        ws.sendCaptureStart(sessionId, source);
        // Start local media recording
        const capture = new MediaCapture();
        captureRef.current = capture;
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
    }, [ws, store]);
    const stopCapture = useCallback(() => {
        const { sessionId } = useCaptureStore.getState();
        if (!sessionId)
            return;
        captureRef.current?.stop();
        captureRef.current = null;
        ws.sendCaptureEnd(sessionId);
        store.setStatus('processing');
        store.setActiveStream(null);
    }, [ws, store]);
    /** Returns a promise that resolves when the user responds to the modal. */
    const waitForRoomSuggestionResponse = useCallback(() => new Promise((resolve) => {
        const { roomSuggestion } = useCaptureStore.getState();
        if (!roomSuggestion) {
            resolve({ action: 'accept' });
            return;
        }
        store.setRoomSuggestion(roomSuggestion, resolve);
    }), [store]);
    return { startCapture, stopCapture, waitForRoomSuggestionResponse };
}
