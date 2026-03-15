/**
 * AudioStreamer — streams raw PCM Int16 audio at 16kHz via AudioWorklet.
 *
 * Replaces the old MediaRecorder-based AudioCapture. Instead of recording
 * WebM chunks, this captures raw PCM suitable for Gemini Live's
 * send_realtime_input (audio/pcm;rate=16000).
 *
 * Each ~100ms, the worklet posts a 1600-sample Int16 buffer which is
 * base64-encoded and delivered to the callback.
 */

export class AudioStreamer {
    private ctx: AudioContext | null = null;
    private worklet: AudioWorkletNode | null = null;
    private stream: MediaStream | null = null;
    private _isStreaming = false;

    /**
     * Start capturing microphone audio and streaming PCM chunks.
     * @param onPcmChunk Called every ~100ms with a base64-encoded Int16 PCM buffer.
     * @param additionalStream Optional extra MediaStream to mix in (e.g. display audio from screen share).
     */
    async start(onPcmChunk: (base64: string) => void, additionalStream?: MediaStream): Promise<void> {
        this.stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
            },
            video: false,
        });

        // Create AudioContext at 16kHz — the browser will resample all inputs
        this.ctx = new AudioContext({ sampleRate: 16000 });

        // Load and register the PCM worklet processor
        await this.ctx.audioWorklet.addModule('/pcm-processor.js');
        this.worklet = new AudioWorkletNode(this.ctx, 'pcm-processor');

        this.worklet.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
            const pcmBytes = new Uint8Array(event.data);
            const base64 = uint8ToBase64(pcmBytes);
            onPcmChunk(base64);
        };

        // Connect microphone
        const micSource = this.ctx.createMediaStreamSource(this.stream);
        micSource.connect(this.worklet);

        // Mix in display/screen-share audio if provided (e.g. YouTube tab audio)
        if (additionalStream) {
            const audioTracks = additionalStream.getAudioTracks();
            if (audioTracks.length > 0) {
                const displayAudioStream = new MediaStream(audioTracks);
                const displaySource = this.ctx.createMediaStreamSource(displayAudioStream);
                displaySource.connect(this.worklet);
            }
        }

        // Worklet doesn't need to connect to destination (no local playback)
        this._isStreaming = true;
    }

    /** Stop capturing and release all resources. */
    stop(): void {
        this._isStreaming = false;
        this.worklet?.disconnect();
        this.worklet = null;
        this.stream?.getTracks().forEach((t) => t.stop());
        this.stream = null;
        this.ctx?.close();
        this.ctx = null;
    }

    get isStreaming(): boolean {
        return this._isStreaming;
    }
}

/** Efficiently convert Uint8Array to base64. */
function uint8ToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Keep backward-compatible export name
export { AudioStreamer as AudioCapture };
