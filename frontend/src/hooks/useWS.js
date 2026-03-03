/**
 * Returns the singleton RayanWebSocket instance for the current user.
 * Creates and connects it on first call; tears it down on sign-out.
 *
 * T109: Also wires response_chunk, response_complete, and artifact_recall
 * messages into voiceStore and AudioPlayback.
 */
import { useEffect, useRef } from 'react';
import { RayanWebSocket } from '../services/websocket';
import { WS_BASE_URL } from '../config/api';
import { useAuthStore } from '../stores/authStore';
import { useCaptureStore } from '../stores/captureStore';
import { usePalaceStore } from '../stores/palaceStore';
import { useVoiceStore } from '../stores/voiceStore';
import { AudioPlayback } from '../services/audioPlayback';
let _instance = null;
/** Singleton AudioPlayback shared across listeners (reset on disconnect). */
let _playback = null;
function getInstance(userId, getToken) {
    if (!_instance) {
        _instance = new RayanWebSocket(WS_BASE_URL, userId, getToken);
    }
    return _instance;
}
export function useWS() {
    const { user } = useAuthStore();
    const wsRef = useRef(null);
    useEffect(() => {
        if (!user) {
            _instance?.disconnect();
            _instance = null;
            wsRef.current = null;
            return;
        }
        const getToken = () => user.getIdToken();
        const ws = getInstance(user.uid, getToken);
        wsRef.current = ws;
        ws.connect();
        // Ensure a fresh AudioPlayback instance for this session
        _playback = new AudioPlayback();
        // Wire server → client messages into Zustand stores
        const unsubs = [
            ws.on('capture_ack', (msg) => {
                useCaptureStore.getState().addConcept(msg.extraction);
            }),
            ws.on('capture_complete', (msg) => {
                useCaptureStore.getState().setSummary(msg.summary);
                useCaptureStore.getState().setStatus('complete');
            }),
            ws.on('room_suggestion', (msg) => {
                // Store the suggestion; useCapture.waitForRoomSuggestionResponse resolves it
                useCaptureStore.getState().setRoomSuggestion(msg);
            }),
            ws.on('palace_update', (msg) => {
                const palaceStore = usePalaceStore.getState();
                msg.changes.roomsAdded?.forEach((r) => palaceStore.addRoom({
                    id: r.id,
                    name: r.name,
                    position: r.position,
                    dimensions: { w: 8, d: 8, h: 4 },
                    style: r.style,
                    connections: [],
                    artifactCount: 0,
                }));
                msg.changes.artifactsAdded?.forEach((a) => palaceStore.addArtifact({
                    id: a.id,
                    roomId: a.roomId,
                    type: a.type,
                    position: a.position,
                    visual: a.visual,
                    summary: a.summary,
                    embedding: [],
                    createdAt: new Date().toISOString(),
                }));
            }),
            ws.on('error', (msg) => {
                console.error('[WS error]', msg.code, msg.message);
            }),
            // ── T109: Voice response wiring ─────────────────────────────────────
            ws.on('response_chunk', (msg) => {
                const voiceStore = useVoiceStore.getState();
                voiceStore.setStatus('responding');
                if (msg.content.text) {
                    voiceStore.appendTranscript(msg.content.text);
                }
                if (msg.content.audioChunk && _playback) {
                    void _playback.enqueue(msg.content.audioChunk);
                }
                if (msg.content.generatedImage) {
                    voiceStore.addDiagram(msg.content.generatedImage);
                }
            }),
            ws.on('response_complete', (_msg) => {
                // Mark responding → idle after a short delay so the panel stays
                // visible just long enough for the user to read the last chunk.
                setTimeout(() => {
                    const voiceStore = useVoiceStore.getState();
                    if (voiceStore.status === 'responding') {
                        voiceStore.setStatus('idle');
                    }
                }, 2500);
            }),
            ws.on('artifact_recall', (msg) => {
                const voiceStore = useVoiceStore.getState();
                voiceStore.setNarration(msg.content);
                voiceStore.setStatus('responding');
                // Play narration audio if present
                if (msg.content.voiceNarration && _playback) {
                    void _playback.enqueue(msg.content.voiceNarration);
                }
            }),
        ];
        return () => {
            unsubs.forEach((fn) => fn());
            _playback?.stop();
            _playback = null;
        };
    }, [user]);
    if (!wsRef.current && user) {
        const getToken = () => user.getIdToken();
        wsRef.current = getInstance(user.uid, getToken);
    }
    // Return a no-op stub when not authenticated so callers don't need to null-check
    return wsRef.current ?? (new Proxy({}, { get: () => () => undefined }));
}
