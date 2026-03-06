/**
 * useVoice — persistent streaming voice session via Gemini Live API.
 *
 * Lifecycle: disconnected → connecting → connected (always streaming) → disconnected
 *
 * On mount: opens a Live session, starts AudioStreamer, continuously streams
 * PCM chunks to the backend. Gemini's built-in VAD handles turn detection.
 * On unmount: closes the session and stops streaming.
 *
 * The hook exposes a mute/unmute toggle (pauses sending chunks, keeps session open).
 */

import { useCallback, useEffect, useRef } from 'react';
import { AudioStreamer } from '../services/audioCapture';
import { useVoiceStore } from '../stores/voiceStore';
import { usePalaceStore } from '../stores/palaceStore';
import { useWS } from './useWS';
import { stopCapture } from './useCapture';

// ── Module-level singletons ──────────────────────────────────────────────────
// Shared across all hook instances so connect/disconnect work regardless of
// which component calls them.
let _streamer: AudioStreamer | null = null;
let _started = false;
let _muted = false;

/** Stop the voice session from outside the hook (e.g. when the server initiates close). */
export function stopVoiceSession(): void {
    if (!_started) return;
    _streamer?.stop();
    _streamer = null;
    useVoiceStore.getState().setStatus('disconnected');
    _started = false;
    _muted = false;
}

export function useVoice() {
    const ws = useWS();
    const wsRef = useRef(ws);
    wsRef.current = ws;

    const store = useVoiceStore();

    /** Start the live session and audio streaming. */
    const connect = useCallback(async () => {
        if (_started) return;

        // Ensure mutual exclusivity
        stopCapture();

        _started = true;

        const voiceStore = useVoiceStore.getState();
        voiceStore.setStatus('connecting');
        voiceStore.setShowPanel(true);

        // Send live_session_start with the room the user is currently in
        const currentRoomId = usePalaceStore.getState().currentRoomId;
        wsRef.current.sendLiveSessionStart({
            currentRoomId,
            focusedArtifactId: null,
        });

        // Start audio capture
        const streamer = new AudioStreamer();
        _streamer = streamer;

        try {
            await streamer.start((base64Pcm) => {
                if (!_muted) {
                    wsRef.current.sendAudioChunk(base64Pcm);
                }
            });
            voiceStore.setStatus('connected');
        } catch (err) {
            voiceStore.setError(err instanceof Error ? err.message : 'Microphone access denied');
            _started = false;
        }
    }, []);

    /** Close the live session and stop streaming. */
    const disconnect = useCallback(() => {
        if (!_started) return; // no active session — nothing to close
        _streamer?.stop();
        _streamer = null;
        wsRef.current.sendLiveSessionEnd();
        useVoiceStore.getState().setStatus('disconnected');
        _started = false;
        _muted = false;
    }, []);

    /** Toggle mute — pauses sending audio chunks but keeps session alive. */
    const toggleMute = useCallback(() => {
        const voiceStore = useVoiceStore.getState();
        const newMuted = !voiceStore.muted;
        _muted = newMuted;
        voiceStore.setMuted(newMuted);
    }, []);



    // Clean up when the user signs out / page unloads
    useEffect(() => {
        return () => {
            if (_started) {
                _streamer?.stop();
                _streamer = null;
                wsRef.current.sendLiveSessionEnd();
                useVoiceStore.getState().setStatus('disconnected');
                _started = false;
                _muted = false;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        status: store.status,
        muted: store.muted,
        transcript: store.transcript,
        diagrams: store.diagrams,
        currentNarration: store.currentNarration,
        error: store.error,
        toggleMute,

        connect,
        disconnect,
    };
}
