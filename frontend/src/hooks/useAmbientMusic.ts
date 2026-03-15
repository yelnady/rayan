/**
 * useAmbientMusic — drives ambient track selection via the AudioEngine.
 *
 * Priority:
 *  1. Bird's-eye overview  → /audio/ambient.mp3
 *  2. Inside a room        → /audio/rooms/<Style>.mp3  (e.g. Library.mp3)
 *  3. Neither              → fade out
 *
 * Crossfade between any two states is handled inside AudioEngine (500 ms).
 */

import { useEffect } from 'react';
import { useCameraStore } from '../stores/cameraStore';
import { usePalaceStore } from '../stores/palaceStore';
import { useVoiceStore } from '../stores/voiceStore';
import { useCaptureStore } from '../stores/captureStore';
import { audioEngine } from '../services/audioEngine';
import type { RoomStyle } from '../types/palace';

const ROOM_TRACK: Record<RoomStyle, string> = {
    library:     '/audio/rooms/Library.mp3',
    lab:         '/audio/rooms/Lab.mp3',
    gallery:     '/audio/rooms/Gallery.mp3',
    garden:      '/audio/rooms/Garden.mp3',
    workshop:    '/audio/rooms/Workshop.mp3',
    museum:      '/audio/rooms/Museum.mp3',
    observatory: '/audio/rooms/Observatory.mp3',
    sanctuary:   '/audio/rooms/Sanctuary.mp3',
    studio:      '/audio/rooms/Studio.mp3',
    dojo:        '/audio/rooms/Dojo.mp3',
};

export function useAmbientMusic(): void {
    const isOverview     = useCameraStore((s) => s.isOverviewMode);
    const currentRoomId  = usePalaceStore((s) => s.currentRoomId);
    const rooms          = usePalaceStore((s) => s.rooms);
    const voiceStatus    = useVoiceStore((s) => s.status);
    const captureStatus  = useCaptureStore((s) => s.status);
    const captureSource  = useCaptureStore((s) => s.sourceType);

    useEffect(() => {
        if (isOverview || !currentRoomId) {
            void audioEngine.playTrack('/audio/rooms/Palace.mp3');
            return;
        }

        const room = rooms.find((r) => r.id === currentRoomId);
        const style = room?.style;
        const url = style ? ROOM_TRACK[style] : null;
        if (url) {
            void audioEngine.playTrack(url);
        } else {
            audioEngine.fadeOut();
        }
    }, [isOverview, currentRoomId, rooms]);

    // Duck to 10% for the full duration of any active session (recall or voice capture).
    // Screen/webcam capture is already muted entirely by the effect below — don't duck there.
    useEffect(() => {
        const sessionActive =
            (voiceStatus !== 'disconnected' && voiceStatus !== 'error') ||
            (captureStatus === 'capturing' && captureSource === 'voice');
        if (sessionActive) {
            audioEngine.duck();
        } else {
            audioEngine.unduck();
        }
    }, [voiceStatus, captureStatus, captureSource]);

    // Mute during screen share / webcam capture so the music doesn't bleed
    // into the tab audio stream that getDisplayMedia captures and sends to the backend.
    useEffect(() => {
        const isCapturing = captureStatus === 'capturing' && captureSource !== 'voice';
        if (isCapturing) {
            audioEngine.mute();
        } else {
            audioEngine.unmute();
        }
    }, [captureStatus, captureSource]);
}
