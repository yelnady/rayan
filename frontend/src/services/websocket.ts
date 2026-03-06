/**
 * WebSocket client for Rayan Memory Palace.
 *
 * Implements the full protocol from websocket.md:
 *   - Auth handshake on connect
 *   - Typed send methods for every client→server message type
 *   - Listener registration for server→client message types
 *   - Heartbeat ping every 30 seconds
 *   - Auto-reconnect with exponential backoff
 */

// ── Server → Client message shapes ──────────────────────────────────────────

export interface CaptureAckMessage {
  type: "capture_ack";
  sessionId: string;
  extraction: { concept: string; confidence: number; timestamp: number };
  voiceResponse: string | null;
}

export interface CaptureCompleteMessage {
  type: "capture_complete";
  sessionId: string;
  summary: {
    conceptCount: number;
    artifactsCreated: string[];
    roomsAffected: string[];
    newRoomsCreated: string[];
  };
  voiceSummary: string;
}



export interface ArtifactRecallMessage {
  type: "artifact_recall";
  artifactId: string;
  content: {
    voiceNarration: string;
    summary: string;
    generatedDiagrams: Array<{ url: string; caption: string }>;
    relatedArtifacts: Array<{ artifactId: string; roomId: string; reason: string }>;
  };
}

export interface EnrichmentUpdateMessage {
  type: "enrichment_update";
  artifactId: string;
  enrichment: {
    id: string;
    sourceName: string;
    sourceUrl: string;
    preview: string;
    images: Array<{ url: string; caption: string }>;
  };
  visualIndicator: { artifactId: string; effect: string };
}

export interface PalaceUpdateMessage {
  type: "palace_update";
  changes: {
    roomsAdded: Array<{ id: string; name: string; position: { x: number; y: number; z: number }; style: string }>;
    artifactsAdded: Array<{ id: string; roomId: string; type: string; position: { x: number; y: number; z: number }; visual: string; summary: string }>;
    connectionsAdded: Array<{ fromRoomId: string; toRoomId: string; reason: string }>;
  };
}

export interface RoomSuggestionMessage {
  type: "room_suggestion";
  artifact_id: string;
  suggestion: {
    action: "create_new" | "assign_existing";
    room: { id: string | null; name: string; style: string; keywords: string[]; reason: string };
    alternatives: Array<{ room_id: string; name: string; similarity: number }>;
  };
  timeout_seconds: number;
  default_action: string;
}

export interface ErrorMessage {
  type: "error";
  code: string;
  message: string;
  retryable: boolean;
}

export interface PongMessage {
  type: "pong";
  serverTime: number;
}

// ── Live streaming message types ────────────────────────────────────────────

export interface LiveSessionStartedMessage {
  type: "live_session_started";
}

export interface LiveAudioMessage {
  type: "live_audio";
  audioChunk: string;
}

export interface LiveTextMessage {
  type: "live_text";
  text: string;
}

export interface LiveUserTextMessage {
  type: "live_user_text";
  text: string;
}

export interface LiveInterruptedMessage {
  type: "live_interrupted";
}

export interface LiveTurnCompleteMessage {
  type: "live_turn_complete";
}

export interface LiveToolCallMessage {
  type: "live_tool_call";
  tool: "navigate_to_room" | "highlight_artifact" | "save_artifact" | "end_session" | "close_artifact";
  label: string;
  payload: {
    navigation?: {
      targetRoomId: string;
      highlightArtifacts: string[];
      enterRoom: boolean;
      selectedArtifactId: string | null;
    };
    artifactId?: string;
    closeArtifact?: boolean;
  };
}

export type ServerMessage =
  | CaptureAckMessage
  | CaptureCompleteMessage
  | CaptureCompleteMessage
  | ArtifactRecallMessage
  | EnrichmentUpdateMessage
  | PalaceUpdateMessage
  | RoomSuggestionMessage
  | ErrorMessage
  | PongMessage
  | LiveSessionStartedMessage
  | LiveAudioMessage
  | LiveTextMessage
  | LiveUserTextMessage
  | LiveInterruptedMessage
  | LiveTurnCompleteMessage
  | LiveToolCallMessage;

// ── Listener types ───────────────────────────────────────────────────────────

type MessageHandler<T extends ServerMessage> = (msg: T) => void;
type Listeners = { [K in ServerMessage["type"]]?: Array<MessageHandler<Extract<ServerMessage, { type: K }>>> };

// ── WebSocket client ─────────────────────────────────────────────────────────

const HEARTBEAT_INTERVAL_MS = 30_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const BASE_RECONNECT_DELAY_MS = 1_000;

export class RayanWebSocket {
  private ws: WebSocket | null = null;
  private listeners: Listeners = {};
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private closed = false;

  constructor(
    private readonly wsUrl: string,
    private readonly userId: string,
    private readonly getToken: () => Promise<string>,
  ) { }

  /** Open the connection (idempotent). */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return;
    this._connect();
  }

  /** Permanently close — no reconnect. */
  disconnect(): void {
    this.closed = true;
    this._clearTimers();
    this.ws?.close(1000, "Client disconnect");
    this.ws = null;
  }

  // ── Client → Server helpers ─────────────────────────────────────────────

  sendCaptureStart(sessionId: string, sourceType: "webcam" | "screen_share" | "upload" | "text_input" | "voice"): void {
    this._send({ type: "capture_start", sessionId, sourceType });
  }

  sendMediaChunk(sessionId: string, chunkIndex: number, data: string, timestamp: number): void {
    this._send({ type: "media_chunk", sessionId, chunkIndex, data, timestamp });
  }

  sendCaptureEnd(sessionId: string): void {
    this._send({ type: "capture_end", sessionId });
  }



  sendArtifactClick(artifactId: string, roomId: string): void {
    this._send({ type: "artifact_click", artifactId, roomId });
  }

  sendRequestConnection(fromRoomId: string, toRoomId: string): void {
    this._send({ type: "request_connection", fromRoomId, toRoomId });
  }

  // ── Live streaming methods ─────────────────────────────────────────────

  sendLiveSessionStart(context: { currentRoomId: string | null; focusedArtifactId: string | null }): void {
    this._send({ type: "live_session_start", context });
  }

  sendAudioChunk(data: string): void {
    this._send({ type: "audio_chunk", data });
  }

  sendLiveSessionEnd(): void {
    this._send({ type: "live_session_end" });
  }

  sendContextUpdate(roomId: string | null): void {
    this._send({ type: "live_context_update", roomId });
  }

  // ── Listener registration ───────────────────────────────────────────────

  on<T extends ServerMessage["type"]>(
    type: T,
    handler: MessageHandler<Extract<ServerMessage, { type: T }>>,
  ): () => void {
    if (!this.listeners[type]) {
      (this.listeners as Record<string, unknown[]>)[type] = [];
    }
    (this.listeners[type] as typeof handler[]).push(handler);

    // Return unsubscribe function
    return () => {
      const arr = this.listeners[type] as typeof handler[] | undefined;
      if (arr) {
        const idx = arr.indexOf(handler);
        if (idx !== -1) arr.splice(idx, 1);
      }
    };
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private _connect(): void {
    const url = `${this.wsUrl}/ws/${this.userId}`;
    const socket = new WebSocket(url);
    this.ws = socket;

    socket.onopen = async () => {
      this.reconnectAttempts = 0;
      // Capture the socket instance from the outer closure to prevent stale-ref bugs
      // if this.ws gets reassigned while getToken() is still resolving.
      const token = await this.getToken();
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "auth", token }));
      }
      this._startHeartbeat();
    };

    socket.onmessage = (event: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(event.data) as ServerMessage;
        // Skip auth_success — it's internal to the handshake
        if ((msg as { type: string }).type === "auth_success") return;
        this._dispatch(msg);
      } catch {
        console.error("[RayanWS] Failed to parse message:", event.data);
      }
    };

    socket.onerror = (event) => {
      console.error("[RayanWS] Error:", event);
    };

    socket.onclose = (event) => {
      this._clearTimers();
      if (!this.closed) {
        this._scheduleReconnect();
      }
      console.info(`[RayanWS] Closed (code=${event.code})`);
    };
  }

  private _send(msg: object): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn("[RayanWS] Cannot send — not connected:", msg);
      return;
    }
    this.ws.send(JSON.stringify(msg));
  }

  private _dispatch(msg: ServerMessage): void {
    const handlers = this.listeners[msg.type] as Array<MessageHandler<typeof msg>> | undefined;
    if (!handlers?.length) return;
    for (const fn of handlers) {
      try {
        fn(msg);
      } catch (err) {
        console.error(`[RayanWS] Handler error for type=${msg.type}:`, err);
      }
    }
  }

  private _startHeartbeat(): void {
    this._clearTimers();
    this.heartbeatTimer = setInterval(() => {
      this._send({ type: "ping" });
    }, HEARTBEAT_INTERVAL_MS);
  }

  private _scheduleReconnect(): void {
    const delay = Math.min(
      BASE_RECONNECT_DELAY_MS * 2 ** this.reconnectAttempts,
      MAX_RECONNECT_DELAY_MS,
    );
    this.reconnectAttempts++;
    console.info(`[RayanWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => this._connect(), delay);
  }

  private _clearTimers(): void {
    if (this.heartbeatTimer !== null) clearInterval(this.heartbeatTimer);
    if (this.reconnectTimer !== null) clearTimeout(this.reconnectTimer);
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
  }
}
