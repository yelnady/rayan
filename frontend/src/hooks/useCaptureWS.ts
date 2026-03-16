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
  // Buffered capture tool event — flushed after Rayan's first text arrives so
  // the spoken message always appears before the "Captured: ..." badge.
  const pendingCaptureEventRef = useRef<{ text: string; toolName: string } | null>(null);
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

    // Capture acknowledgment (concept extracted).
    // Buffer the tool badge — it will be flushed after Rayan's first spoken text
    // so the message always appears before the "Captured: ..." badge.
    unsubscribers.push(
      ws.on('capture_ack', (msg: CaptureAckMessage) => {
        const { extraction, voiceResponse } = msg;
        pendingCaptureEventRef.current = {
          text: `Captured: ${extraction.concept} (${Math.round(extraction.confidence * 100)}%)`,
          toolName: 'capture_concept',
        };
        if (voiceResponse) {
          appendRayanText(voiceResponse);
        }
        console.log('[useCaptureWS] Concept extracted:', extraction.concept);
      })
    );

    // Text transcription from Rayan — flush any buffered capture badge first so
    // Rayan's message always precedes the "Captured: ..." tool event.
    unsubscribers.push(
      ws.on('capture_text', (msg: CaptureTextMessage) => {
        appendRayanText(msg.text);
        if (pendingCaptureEventRef.current) {
          addToolEvent(pendingCaptureEventRef.current.text, pendingCaptureEventRef.current.toolName);
          pendingCaptureEventRef.current = null;
        }
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
