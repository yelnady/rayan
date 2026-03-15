/**
 * MediaCapture — captures video frames as JPEG images for streaming to Gemini Live.
 *
 * Per Gemini Live API docs, video input must be sent as individual JPEG frames
 * (max 1 frame per second) via send_realtime_input(video=Blob(mime_type="image/jpeg")).
 * Audio from the display stream is handled separately by AudioStreamer (PCM mixing).
 */

export type CaptureSource = 'webcam' | 'screen_share' | 'voice';

interface MediaCaptureOptions {
  source: CaptureSource;
  /** Frames per second — capped at 1 per Gemini Live API limit. */
  fps?: number;
  onFrame: (jpegBase64: string, index: number, timestamp: number) => void;
  onError: (err: Error) => void;
}

export class MediaCapture {
  private stream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private frameIndex = 0;

  async start(opts: MediaCaptureOptions): Promise<void> {
    this.frameIndex = 0;

    if (opts.source === 'webcam') {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } else if (opts.source === 'screen_share') {
      this.stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    } else {
      // voice-only — no video frames
      return;
    }

    // Feed the stream into an offscreen video element so we can draw frames
    this.videoEl = document.createElement('video');
    this.videoEl.srcObject = this.stream;
    this.videoEl.muted = true;
    await this.videoEl.play();

    this.canvas = document.createElement('canvas');

    // Gemini Live cap: max 1 fps
    const fps = Math.min(opts.fps ?? 1, 1);
    const intervalMs = Math.round(1000 / fps);

    this.intervalId = setInterval(() => {
      if (!this.videoEl || !this.canvas) return;
      const { videoWidth, videoHeight } = this.videoEl;
      if (videoWidth === 0 || videoHeight === 0) return;

      this.canvas.width = videoWidth;
      this.canvas.height = videoHeight;
      const ctx = this.canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(this.videoEl, 0, 0);

      const dataUrl = this.canvas.toDataURL('image/jpeg', 0.8);
      const base64 = dataUrl.split(',')[1];
      opts.onFrame(base64, this.frameIndex++, Date.now());
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.videoEl) {
      this.videoEl.srcObject = null;
      this.videoEl = null;
    }
    this.canvas = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  /** Returns the raw MediaStream so the UI can render a live preview and
   *  AudioStreamer can mix in the display audio track. */
  getStream(): MediaStream | null {
    return this.stream;
  }

  get isRecording(): boolean {
    return this.intervalId !== null;
  }
}
