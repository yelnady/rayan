/**
 * useVoice — orchestrates the full push-to-talk voice query lifecycle.
 *
 * Covers T104 (lifecycle) and T110 (Voice Activity Detection / interrupt).
 *
 * Flow:
 *   startListening(ctx) → AudioCapture starts → VAD timer runs
 *     → user presses stop OR VAD detects silence → stopListening()
 *     → combined audio sent as voice_query to backend
 *     → backend streams response_chunk → useWS feeds voiceStore
 *     → AudioPlayback plays audio chunks in order
 *
 * VAD: An AnalyserNode monitors microphone volume every 100 ms.
 * If the RMS level drops below SILENCE_THRESHOLD for SILENCE_MS, the
 * recording automatically stops (barge-in style).
 */

import { useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AudioCapture } from '../services/audioCapture';
import { AudioPlayback } from '../services/audioPlayback';
import { useVoiceStore } from '../stores/voiceStore';
import { useWS } from './useWS';

// ── VAD tuning ────────────────────────────────────────────────────────────────

/** RMS level below which audio is considered silence (0–1 scale). */
const SILENCE_THRESHOLD = 0.015;
/** Milliseconds of continuous silence before auto-stop triggers. */
const SILENCE_MS = 1500;
/** How often we poll the AnalyserNode (ms). */
const VAD_POLL_MS = 100;

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useVoice() {
    const ws = useWS();
    const store = useVoiceStore();

    const captureRef = useRef<AudioCapture | null>(null);
    const playbackRef = useRef<AudioPlayback | null>(null);
    const chunksRef = useRef<string[]>([]); // accumulate base64 chunks in-memory
    const vadTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const silenceStartRef = useRef<number | null>(null);

    // ── Ensure playback instance is ready ────────────────────────────────────

    function getPlayback(): AudioPlayback {
        if (!playbackRef.current) {
            playbackRef.current = new AudioPlayback();
        }
        return playbackRef.current;
    }

    // ── VAD — monitors mic signal and auto-stops on prolonged silence ─────────

    const startVAD = useCallback((capture: AudioCapture, onSilence: () => void) => {
        const analyser = capture.getAnalyser();
        if (!analyser) return;

        const data = new Uint8Array(analyser.fftSize);
        silenceStartRef.current = null;

        vadTimerRef.current = setInterval(() => {
            analyser.getByteTimeDomainData(data);

            // Compute RMS
            let sum = 0;
            for (const v of data) {
                const normalised = v / 128 - 1;
                sum += normalised * normalised;
            }
            const rms = Math.sqrt(sum / data.length);

            if (rms < SILENCE_THRESHOLD) {
                if (silenceStartRef.current === null) {
                    silenceStartRef.current = Date.now();
                } else if (Date.now() - silenceStartRef.current >= SILENCE_MS) {
                    // Prolonged silence — auto-stop
                    stopVAD();
                    onSilence();
                }
            } else {
                silenceStartRef.current = null; // reset on speech
            }
        }, VAD_POLL_MS);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const stopVAD = useCallback(() => {
        if (vadTimerRef.current !== null) {
            clearInterval(vadTimerRef.current);
            vadTimerRef.current = null;
        }
        silenceStartRef.current = null;
    }, []);

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Start a new push-to-talk session.
     * @param context  The current room/artifact context for the query.
     */
    const startListening = useCallback(
        async (context: { currentRoomId: string | null; focusedArtifactId: string | null }) => {
            if (store.status !== 'idle' && store.status !== 'error') return;

            store.reset();
            const queryId = uuidv4();
            store.setActiveQueryId(queryId);
            store.setStatus('listening');
            chunksRef.current = [];

            const capture = new AudioCapture();
            captureRef.current = capture;

            try {
                await capture.start({
                    onChunk: (data) => {
                        chunksRef.current.push(data);
                    },
                    onError: (err) => {
                        store.setError(err.message);
                        stopVAD();
                    },
                });
            } catch (err) {
                store.setError(err instanceof Error ? err.message : 'Microphone access denied');
                return;
            }

            // Start VAD — auto-stops when silence detected
            startVAD(capture, () => {
                // Fire-and-forget; stopListening will update state
                void stopListeningImpl(queryId, context);
            });

            // Expose context on ref so stopListening can read it
            stopContextRef.current = { queryId, context };
        },
        [store, startVAD, stopVAD], // eslint-disable-line react-hooks/exhaustive-deps
    );

    // Store current stop context for imperative stop
    const stopContextRef = useRef<{
        queryId: string;
        context: { currentRoomId: string | null; focusedArtifactId: string | null };
    } | null>(null);

    /** Internal implementation shared between manual stop and VAD auto-stop. */
    const stopListeningImpl = useCallback(
        async (
            queryId: string,
            context: { currentRoomId: string | null; focusedArtifactId: string | null },
        ) => {
            stopVAD();
            captureRef.current?.stop();
            captureRef.current = null;

            store.setStatus('processing');

            // Combine all chunks into a single base64 string joined by '|' as a
            // delimiter; the backend handler decodes each segment independently.
            // For simplicity, send the last chunk (most codecs produce a self-contained
            // fragment per MediaRecorder.stop).  Use ',' delimiter for easy splitting.
            const combinedAudio = chunksRef.current.join(',');
            chunksRef.current = [];

            if (combinedAudio) {
                ws.sendVoiceQuery(queryId, combinedAudio, context);
            } else {
                store.reset();
            }
        },
        [ws, store, stopVAD],
    );

    /**
     * Manually stop recording and send the accumulated audio.
     */
    const stopListening = useCallback(() => {
        const ctx = stopContextRef.current;
        if (!ctx) return;
        stopContextRef.current = null;
        void stopListeningImpl(ctx.queryId, ctx.context);
    }, [stopListeningImpl]);

    /**
     * Send an interrupt to stop the current backend response and
     * stop local audio playback.
     */
    const interrupt = useCallback(() => {
        stopVAD();
        captureRef.current?.stop();
        captureRef.current = null;
        playbackRef.current?.stop();
        playbackRef.current = null;
        chunksRef.current = [];
        stopContextRef.current = null;
        ws.sendInterrupt();
        store.reset();
    }, [ws, store, stopVAD]);

    // ── Enqueue audio chunks from voiceStore.diagrams when status is responding ─

    // Wire AudioPlayback to respond to new diagrams — handled in useWS instead.
    // Here we expose the playback instance for useWS to call enqueue() on it.
    useEffect(() => {
        return () => {
            // Cleanup on unmount
            stopVAD();
            captureRef.current?.stop();
            playbackRef.current?.stop();
        };
    }, [stopVAD]);

    return {
        status: store.status,
        transcript: store.transcript,
        diagrams: store.diagrams,
        currentNarration: store.currentNarration,
        error: store.error,
        getPlayback,
        startListening,
        stopListening,
        interrupt,
    };
}
