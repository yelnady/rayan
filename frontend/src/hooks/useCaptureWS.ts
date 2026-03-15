import { useEffect, useRef } from 'react';
import { useWS } from './useWS';
import { useCaptureStore } from '../stores/captureStore';
import { AudioPlayback } from '../services/audioPlayback';
import type { CaptureAckMessage, CaptureAudioMessage, CaptureSessionStartedMessage, CaptureSessionEndedMessage, CaptureTextMessage, CaptureToolEventMessage, CaptureUserTextMessage } from '../services/websocket';

/**
 * Hook to handle capture session WebSocket messages.
 * Listens for capture-related messages and updates the capture store.
 */
export function useCaptureWS() {
  const ws = useWS();
  const playbackRef = useRef<AudioPlayback | null>(null);
  const {
    addToolEvent,
    appendRayanText,
    appendUserText,
    setShowPanel,
    setStatus,
    clearMessages,
  } = useCaptureStore();

  useEffect(() => {
    const unsubscribers: Array<() => void> = [];

    // Own AudioPlayback instance for capture — decoupled from the recall session's playback
    playbackRef.current = new AudioPlayback();

    // Session started
    unsubscribers.push(
      ws.on('capture_session_started', (msg: CaptureSessionStartedMessage) => {
        setStatus('capturing');
        setShowPanel(true);
        clearMessages();
        console.log('[useCaptureWS] Capture session started:', msg.sessionId);
      })
    );

    // Session ended — keep panel open so the user can review what was captured
    unsubscribers.push(
      ws.on('capture_session_ended', (msg: CaptureSessionEndedMessage) => {
        setStatus('complete');
        console.log('[useCaptureWS] Capture session ended:', msg.sessionId);
      })
    );

    // Capture acknowledgment (concept extracted)
    unsubscribers.push(
      ws.on('capture_ack', (msg: CaptureAckMessage) => {
        const { extraction, voiceResponse } = msg;
        // Add tool event for the concept extraction
        addToolEvent(
          `Captured: ${extraction.concept} (${Math.round(extraction.confidence * 100)}%)`,
          'capture_concept'
        );
        // Add voice response as text from Rayan
        if (voiceResponse) {
          appendRayanText(voiceResponse);
        }
        console.log('[useCaptureWS] Concept extracted:', extraction.concept);
      })
    );

    // Text transcription from Rayan — shown in ResponsePanel
    unsubscribers.push(
      ws.on('capture_text', (msg: CaptureTextMessage) => {
        appendRayanText(msg.text);
      })
    );

    // Text transcription from User — shown in ResponsePanel
    unsubscribers.push(
      ws.on('capture_user_text', (msg: CaptureUserTextMessage) => {
        appendUserText(msg.text);
      })
    );

    // Audio from Rayan — played via a dedicated AudioPlayback instance for capture
    unsubscribers.push(
      ws.on('capture_audio', (msg: CaptureAudioMessage) => {
        if (playbackRef.current) void playbackRef.current.enqueue(msg.data);
      })
    );

    // Tool events — badge in the left panel for every agent action
    unsubscribers.push(
      ws.on('capture_tool_event', (msg: CaptureToolEventMessage) => {
        addToolEvent(msg.label, msg.tool);
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
      playbackRef.current?.stop();
      playbackRef.current = null;
    };
  }, [ws, addToolEvent, appendRayanText, setShowPanel, setStatus, clearMessages]);
}
