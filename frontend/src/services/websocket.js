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
// ── WebSocket client ─────────────────────────────────────────────────────────
const HEARTBEAT_INTERVAL_MS = 30_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const BASE_RECONNECT_DELAY_MS = 1_000;
export class RayanWebSocket {
    wsUrl;
    userId;
    getToken;
    ws = null;
    listeners = {};
    heartbeatTimer = null;
    reconnectTimer = null;
    reconnectAttempts = 0;
    closed = false;
    constructor(wsUrl, userId, getToken) {
        this.wsUrl = wsUrl;
        this.userId = userId;
        this.getToken = getToken;
    }
    /** Open the connection (idempotent). */
    connect() {
        if (this.ws?.readyState === WebSocket.OPEN)
            return;
        this._connect();
    }
    /** Permanently close — no reconnect. */
    disconnect() {
        this.closed = true;
        this._clearTimers();
        this.ws?.close(1000, "Client disconnect");
        this.ws = null;
    }
    // ── Client → Server helpers ─────────────────────────────────────────────
    sendCaptureStart(sessionId, sourceType) {
        this._send({ type: "capture_start", sessionId, sourceType });
    }
    sendMediaChunk(sessionId, chunkIndex, data, timestamp) {
        this._send({ type: "media_chunk", sessionId, chunkIndex, data, timestamp });
    }
    sendCaptureEnd(sessionId) {
        this._send({ type: "capture_end", sessionId });
    }
    sendVoiceQuery(queryId, audioData, context) {
        this._send({ type: "voice_query", queryId, audioData, context });
    }
    sendTextQuery(queryId, text, context) {
        this._send({ type: "text_query", queryId, text, context });
    }
    sendInterrupt() {
        this._send({ type: "interrupt" });
    }
    sendArtifactClick(artifactId, roomId) {
        this._send({ type: "artifact_click", artifactId, roomId });
    }
    sendRequestConnection(fromRoomId, toRoomId) {
        this._send({ type: "request_connection", fromRoomId, toRoomId });
    }
    // ── Live streaming methods ─────────────────────────────────────────────
    sendLiveSessionStart(context) {
        this._send({ type: "live_session_start", context });
    }
    sendAudioChunk(data) {
        this._send({ type: "audio_chunk", data });
    }
    sendLiveSessionEnd() {
        this._send({ type: "live_session_end" });
    }
    // ── Listener registration ───────────────────────────────────────────────
    on(type, handler) {
        if (!this.listeners[type]) {
            this.listeners[type] = [];
        }
        this.listeners[type].push(handler);
        // Return unsubscribe function
        return () => {
            const arr = this.listeners[type];
            if (arr) {
                const idx = arr.indexOf(handler);
                if (idx !== -1)
                    arr.splice(idx, 1);
            }
        };
    }
    // ── Private ─────────────────────────────────────────────────────────────
    _connect() {
        const url = `${this.wsUrl}/ws/${this.userId}`;
        this.ws = new WebSocket(url);
        this.ws.onopen = async () => {
            this.reconnectAttempts = 0;
            // Capture the current ws instance in the closure.
            // After the async getToken() resolves, this.ws may have been replaced
            // by a reconnect cycle, causing _send()'s readyState check to fail.
            // Sending directly on the captured instance avoids the stale-ref bug.
            const socket = this.ws;
            const token = await this.getToken();
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: "auth", token }));
            }
            this._startHeartbeat();
        };
        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                // Skip auth_success — it's internal to the handshake
                if (msg.type === "auth_success")
                    return;
                this._dispatch(msg);
            }
            catch {
                console.error("[RayanWS] Failed to parse message:", event.data);
            }
        };
        this.ws.onerror = (event) => {
            console.error("[RayanWS] Error:", event);
        };
        this.ws.onclose = (event) => {
            this._clearTimers();
            if (!this.closed) {
                this._scheduleReconnect();
            }
            console.info(`[RayanWS] Closed (code=${event.code})`);
        };
    }
    _send(msg) {
        if (this.ws?.readyState !== WebSocket.OPEN) {
            console.warn("[RayanWS] Cannot send — not connected:", msg);
            return;
        }
        this.ws.send(JSON.stringify(msg));
    }
    _dispatch(msg) {
        const handlers = this.listeners[msg.type];
        if (!handlers?.length)
            return;
        for (const fn of handlers) {
            try {
                fn(msg);
            }
            catch (err) {
                console.error(`[RayanWS] Handler error for type=${msg.type}:`, err);
            }
        }
    }
    _startHeartbeat() {
        this._clearTimers();
        this.heartbeatTimer = setInterval(() => {
            this._send({ type: "ping" });
        }, HEARTBEAT_INTERVAL_MS);
    }
    _scheduleReconnect() {
        const delay = Math.min(BASE_RECONNECT_DELAY_MS * 2 ** this.reconnectAttempts, MAX_RECONNECT_DELAY_MS);
        this.reconnectAttempts++;
        console.info(`[RayanWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        this.reconnectTimer = setTimeout(() => this._connect(), delay);
    }
    _clearTimers() {
        if (this.heartbeatTimer !== null)
            clearInterval(this.heartbeatTimer);
        if (this.reconnectTimer !== null)
            clearTimeout(this.reconnectTimer);
        this.heartbeatTimer = null;
        this.reconnectTimer = null;
    }
}
