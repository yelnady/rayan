/**
 * AudioCapture — microphone-only MediaRecorder for voice queries.
 *
 * Mirrors MediaCapture (mediaCapture.ts) but captures audio only and uses a
 * shorter timeslice (250 ms) for lower latency.  Each chunk is base64-encoded
 * and delivered via the onChunk callback so it can be accumulated and sent to
 * the backend as a single voice_query message when recording stops.
 */

interface AudioCaptureOptions {
    /** Called for every recorded chunk (base64 audio/webm). */
    onChunk: (data: string, index: number, timestamp: number) => void;
    /** Called when the MediaRecorder emits an error. */
    onError: (err: Error) => void;
    /** Chunk interval in ms (default: 250 ms). */
    timeslice?: number;
}

export class AudioCapture {
    private recorder: MediaRecorder | null = null;
    private stream: MediaStream | null = null;
    private analyser: AnalyserNode | null = null;
    private audioCtx: AudioContext | null = null;
    private chunkIndex = 0;

    /**
     * Start microphone capture.  Resolves when the recorder is running.
     * The caller should call `stop()` to end the session.
     */
    async start(opts: AudioCaptureOptions): Promise<void> {
        this.chunkIndex = 0;

        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

        // Set up Web Audio AnalyserNode so VAD can inspect the mic signal
        this.audioCtx = new AudioContext();
        const source = this.audioCtx.createMediaStreamSource(this.stream);
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 512;
        source.connect(this.analyser);

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm';

        this.recorder = new MediaRecorder(this.stream, { mimeType });

        this.recorder.ondataavailable = async (event) => {
            if (!event.data || event.data.size === 0) return;
            const buffer = await event.data.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
            opts.onChunk(base64, this.chunkIndex++, Date.now());
        };

        this.recorder.onerror = () => {
            opts.onError(new Error('AudioRecorder error'));
        };

        this.recorder.start(opts.timeslice ?? 250);
    }

    /** Stop recording and release all media resources. */
    stop(): void {
        this.recorder?.stop();
        this.stream?.getTracks().forEach((t) => t.stop());
        this.audioCtx?.close();
        this.recorder = null;
        this.stream = null;
        this.analyser = null;
        this.audioCtx = null;
    }

    /**
     * Returns the AnalyserNode so the caller can implement VAD
     * (voice activity detection) without coupling to AudioContext internals.
     */
    getAnalyser(): AnalyserNode | null {
        return this.analyser;
    }

    get isRecording(): boolean {
        return this.recorder?.state === 'recording';
    }
}
