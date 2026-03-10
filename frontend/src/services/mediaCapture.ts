/**
 * MediaCapture — wraps MediaRecorder for webcam and screen share capture.
 * Fires onChunk callbacks with base64-encoded WebM chunks for streaming
 * to the backend via WebSocket.
 */

export type CaptureSource = 'webcam' | 'screen_share' | 'voice';

interface MediaCaptureOptions {
  source: CaptureSource;
  /** Chunk interval in ms (default 1000). */
  timeslice?: number;
  onChunk: (data: string, index: number, timestamp: number) => void;
  onError: (err: Error) => void;
}

export class MediaCapture {
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunkIndex = 0;

  async start(opts: MediaCaptureOptions): Promise<void> {
    this.chunkIndex = 0;

    if (opts.source === 'webcam') {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } else if (opts.source === 'voice') {
      // Voice-only mode — MediaCapture handles NO data if AudioStreamer is used.
      // But we can let it capture audio:true just in case, but prefer disabling it here.
      this.stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: false });
    } else {
      this.stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm';

    this.recorder = new MediaRecorder(this.stream, { mimeType });

    this.recorder.ondataavailable = async (event) => {
      if (!event.data || event.data.size === 0) return;
      const buffer = await event.data.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      opts.onChunk(base64, this.chunkIndex++, Date.now());
    };

    this.recorder.onerror = () => {
      opts.onError(new Error('MediaRecorder error'));
    };

    this.recorder.start(opts.timeslice ?? 1000);
  }

  stop(): void {
    this.recorder?.stop();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.recorder = null;
    this.stream = null;
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  get isRecording(): boolean {
    return this.recorder?.state === 'recording';
  }
}
