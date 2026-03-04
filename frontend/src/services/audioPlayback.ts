/**
 * AudioPlayback — streams base64-encoded PCM audio chunks over Web Audio API.
 *
 * Gemini Live API returns raw Linear16 PCM (24 kHz, mono, 16-bit).
 * The browser's decodeAudioData() cannot handle raw PCM — we must wrap it
 * in a WAV container first.
 *
 * Usage pattern:
 *   const player = new AudioPlayback();
 *   player.enqueue('base64data...');  // called per response_chunk
 *   player.stop();                    // on interrupt or end
 */

/** Sample rate Gemini Live uses for its audio output. */
const GEMINI_SAMPLE_RATE = 24000;

/**
 * Wrap raw Linear16 PCM bytes in a minimal WAV container so the browser's
 * decodeAudioData() can parse them.
 */
function pcmToWav(pcmBytes: Uint8Array, sampleRate = GEMINI_SAMPLE_RATE): ArrayBuffer {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmBytes.byteLength;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const write = (offset: number, val: string) =>
        [...val].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));

    write(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    write(8, 'WAVE');
    write(12, 'fmt ');
    view.setUint32(16, 16, true);           // subchunk1 size
    view.setUint16(20, 1, true);            // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    write(36, 'data');
    view.setUint32(40, dataSize, true);
    new Uint8Array(buffer, 44).set(pcmBytes);
    return buffer;
}

export class AudioPlayback {
    private ctx: AudioContext | null = null;
    private scheduledUntil = 0;
    private bufferQueue: AudioBufferSourceNode[] = [];
    private _isPlaying = false;

    private getContext(): AudioContext {
        if (!this.ctx || this.ctx.state === 'closed') {
            // Pin to Gemini's sample rate to avoid resampling artifacts
            this.ctx = new AudioContext({ sampleRate: GEMINI_SAMPLE_RATE });
            this.scheduledUntil = 0;
        }
        return this.ctx;
    }

    /**
     * Decode and schedule a base64-encoded PCM audio chunk for playback.
     * Chunks are played sequentially without gaps.
     */
    async enqueue(base64: string): Promise<void> {
        try {
            const binary = atob(base64);
            const pcmBytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                pcmBytes[i] = binary.charCodeAt(i);
            }

            // Wrap raw Linear16 PCM → WAV so decodeAudioData can parse it
            const wavBuffer = pcmToWav(pcmBytes);

            const ctx = this.getContext();
            const audioBuffer = await ctx.decodeAudioData(wavBuffer);

            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);

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
