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
import { useWS } from './useWS';

export function useVoice() {
    const ws = useWS();
    const store = useVoiceStore();

    const streamerRef = useRef<AudioStreamer | null>(null);
    const mutedRef = useRef(false);
    // Track whether we've already started to prevent double-start in StrictMode
    const startedRef = useRef(false);

    /** Start the live session and audio streaming. */
    const connect = useCallback(async () => {
        if (startedRef.current) return;
        startedRef.current = true;

        const voiceStore = useVoiceStore.getState();
        voiceStore.setStatus('connecting');

        // Send live_session_start to backend
        ws.sendLiveSessionStart({
            currentRoomId: null,
            focusedArtifactId: null,
        });

        // Start audio capture
        const streamer = new AudioStreamer();
        streamerRef.current = streamer;

        try {
            await streamer.start((base64Pcm) => {
                if (!mutedRef.current) {
                    ws.sendAudioChunk(base64Pcm);
                }
            });
            voiceStore.setStatus('connected');
        } catch (err) {
            voiceStore.setError(err instanceof Error ? err.message : 'Microphone access denied');
            startedRef.current = false;
        }
    }, [ws]);

    /** Close the live session and stop streaming. */
    const disconnect = useCallback(() => {
        streamerRef.current?.stop();
        streamerRef.current = null;
        ws.sendLiveSessionEnd();
        useVoiceStore.getState().setStatus('disconnected');
        startedRef.current = false;
    }, [ws]);

    /** Toggle mute — pauses sending audio chunks but keeps session alive. */
    const toggleMute = useCallback(() => {
        const voiceStore = useVoiceStore.getState();
        const newMuted = !voiceStore.muted;
        mutedRef.current = newMuted;
        voiceStore.setMuted(newMuted);
    }, []);

    /** Interrupt — stop Gemini's current response. */
    const interrupt = useCallback(() => {
        ws.sendInterrupt();
    }, [ws]);

    // Clean up on unmount (no auto-start — user must click VoiceButton)
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return {
        status: store.status,
        muted: store.muted,
        transcript: store.transcript,
        diagrams: store.diagrams,
        currentNarration: store.currentNarration,
        error: store.error,
        toggleMute,
        interrupt,
        connect,
        disconnect,
    };
}
