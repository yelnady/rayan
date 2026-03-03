/**
 * MediaCapture — wraps MediaRecorder for webcam and screen share capture.
 * Fires onChunk callbacks with base64-encoded WebM chunks for streaming
 * to the backend via WebSocket.
 */
export class MediaCapture {
    recorder = null;
    stream = null;
    chunkIndex = 0;
    async start(opts) {
        this.chunkIndex = 0;
        this.stream =
            opts.source === 'webcam'
                ? await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                : await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
            ? 'video/webm;codecs=vp9,opus'
            : 'video/webm';
        this.recorder = new MediaRecorder(this.stream, { mimeType });
        this.recorder.ondataavailable = async (event) => {
            if (!event.data || event.data.size === 0)
                return;
            const buffer = await event.data.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
            opts.onChunk(base64, this.chunkIndex++, Date.now());
        };
        this.recorder.onerror = () => {
            opts.onError(new Error('MediaRecorder error'));
        };
        this.recorder.start(opts.timeslice ?? 1000);
    }
    stop() {
        this.recorder?.stop();
        this.stream?.getTracks().forEach((track) => track.stop());
        this.recorder = null;
        this.stream = null;
    }
    getStream() {
        return this.stream;
    }
    get isRecording() {
        return this.recorder?.state === 'recording';
    }
}
