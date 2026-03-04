/**
 * PCM AudioWorklet processor for Gemini Live API.
 *
 * Accumulates ~100ms of 16kHz mono audio (1600 samples) and posts
 * an Int16 ArrayBuffer to the main thread for base64 encoding.
 */

const CHUNK_SAMPLES = 1600; // 100ms @ 16kHz

class PcmProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this._buffer = new Int16Array(CHUNK_SAMPLES);
        this._offset = 0;
    }

    process(inputs) {
        const input = inputs[0];
        if (!input || !input[0]) return true;

        const samples = input[0]; // Float32Array, mono channel

        for (let i = 0; i < samples.length; i++) {
            // Clamp and convert Float32 [-1, 1] → Int16
            const clamped = Math.max(-1, Math.min(1, samples[i]));
            this._buffer[this._offset++] = clamped < 0
                ? clamped * 0x8000
                : clamped * 0x7fff;

            if (this._offset >= CHUNK_SAMPLES) {
                // Transfer the buffer to avoid copying
                this.port.postMessage(this._buffer.buffer, [this._buffer.buffer]);
                this._buffer = new Int16Array(CHUNK_SAMPLES);
                this._offset = 0;
            }
        }

        return true;
    }
}

registerProcessor('pcm-processor', PcmProcessor);
