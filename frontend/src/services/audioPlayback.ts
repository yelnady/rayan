/**
 * AudioPlayback — streams base64-encoded audio chunks over Web Audio API.
 *
 * Usage pattern:
 *   const player = new AudioPlayback();
 *   // called for each response_chunk that has an audioChunk
 *   player.enqueue('base64data...');
 *   // when interrupted or response ends
 *   player.stop();
 */
export class AudioPlayback {
    private ctx: AudioContext | null = null;
    private scheduledUntil = 0; // AudioContext time
    private bufferQueue: AudioBufferSourceNode[] = [];
    private _isPlaying = false;

    private getContext(): AudioContext {
        if (!this.ctx || this.ctx.state === 'closed') {
            this.ctx = new AudioContext();
            this.scheduledUntil = 0;
        }
        return this.ctx;
    }

    /**
     * Decode and schedule a base64-encoded audio chunk for playback.
     * Chunks are played sequentially without gaps.
     */
    async enqueue(base64: string): Promise<void> {
        try {
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }

            const ctx = this.getContext();
            const audioBuffer = await ctx.decodeAudioData(bytes.buffer);

            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);

            // Schedule to play right after the previous chunk ends
            const startTime = Math.max(ctx.currentTime, this.scheduledUntil);
            source.start(startTime);
            this.scheduledUntil = startTime + audioBuffer.duration;

            source.onended = () => {
                const idx = this.bufferQueue.indexOf(source);
                if (idx !== -1) this.bufferQueue.splice(idx, 1);
                if (this.bufferQueue.length === 0) this._isPlaying = false;
            };

            this.bufferQueue.push(source);
            this._isPlaying = true;
        } catch (err) {
            console.error('[AudioPlayback] Failed to decode/schedule chunk:', err);
        }
    }

    /**
     * Stop all currently scheduled/playing nodes immediately and close the
     * AudioContext so the browser releases hardware resources.
     */
    stop(): void {
        for (const node of this.bufferQueue) {
            try {
                node.stop();
            } catch {
                // Already stopped — safe to ignore
            }
        }
        this.bufferQueue = [];
        this.scheduledUntil = 0;
        this._isPlaying = false;
        this.ctx?.close();
        this.ctx = null;
    }

    get isPlaying(): boolean {
        return this._isPlaying;
    }
}
