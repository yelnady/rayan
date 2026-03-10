import { useEffect } from 'react';
import { useWS } from './useWS';
import { useCaptureStore } from '../stores/captureStore';
import type { CaptureAckMessage, CaptureAudioMessage, CaptureSessionStartedMessage, CaptureSessionEndedMessage, CaptureTextMessage, CaptureToolCallMessage } from '../services/websocket';

/**
 * Hook to handle capture session WebSocket messages.
 * Listens for capture-related messages and updates the capture store.
 */
export function useCaptureWS() {
  const ws = useWS();
  const {
    addToolEvent,
    appendRayanText,
    setShowPanel,
    setStatus,
    clearMessages,
  } = useCaptureStore();

  useEffect(() => {
    const unsubscribers: Array<() => void> = [];

    // Session started
    unsubscribers.push(
      ws.on('capture_session_started', (msg: CaptureSessionStartedMessage) => {
        setStatus('capturing');
        setShowPanel(true);
        clearMessages();
        console.log('[useCaptureWS] Capture session started:', msg.sessionId);
      })
    );

    // Session ended
    unsubscribers.push(
      ws.on('capture_session_ended', (msg: CaptureSessionEndedMessage) => {
        setStatus('complete');
        setShowPanel(false);
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

    // Audio from Rayan
    unsubscribers.push(
      ws.on('capture_audio', (msg: CaptureAudioMessage) => {
        // Audio would be played by the audio player
        console.log('[useCaptureWS] Audio chunk received');
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [ws, addToolEvent, appendRayanText, setShowPanel, setStatus, clearMessages]);
}
