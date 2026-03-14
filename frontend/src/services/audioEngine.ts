/**
 * AudioEngine — Web Audio API singleton for ambient music and spatial SFX.
 *
 * Features:
 *  - Crossfade between tracks using two gain nodes (A/B flip).
 *  - Buffer cache so tracks are decoded only once per session.
 *  - playChime(pan) — one-shot spatial chime at artifact click.
 *
 * Volume targets:
 *  - Ambient tracks: 0.12 (felt, not heard)
 *  - Chime: 0.55 (just noticeable above ambient)
 */

const AMBIENT_VOLUME = 0.16;
const CHIME_VOLUME   = 0.55;
const CROSSFADE_MS   = 500;

type Slot = {
    source: AudioBufferSourceNode | null;
    gain: GainNode;
};

class AudioEngine {
    private ctx: AudioContext | null = null;
    private slotA: Slot | null = null;
    private slotB: Slot | null = null;
    private activeSlot: 'A' | 'B' = 'A';
    private currentUrl: string | null = null;
    private cache = new Map<string, AudioBuffer>();

    // ── Init ──────────────────────────────────────────────────────────────────

    private getCtx(): AudioContext {
        if (!this.ctx) {
            this.ctx = new AudioContext();
            // Build A/B gain nodes connected to destination.
            const mkSlot = (): Slot => {
                const gain = this.ctx!.createGain();
                gain.gain.value = 0;
                gain.connect(this.ctx!.destination);
                return { source: null, gain };
            };
            this.slotA = mkSlot();
            this.slotB = mkSlot();
        }
        if (this.ctx.state === 'suspended') {
            void this.ctx.resume();
        }
        return this.ctx;
    }

    // ── Buffer loading ────────────────────────────────────────────────────────

    private async loadBuffer(url: string): Promise<AudioBuffer | null> {
        if (this.cache.has(url)) return this.cache.get(url)!;
        try {
            const res = await fetch(url);
            if (!res.ok) return null;
            const raw = await res.arrayBuffer();
            const buf = await this.getCtx().decodeAudioData(raw);
            this.cache.set(url, buf);
            return buf;
        } catch {
            return null;
        }
    }

    // ── Crossfade ─────────────────────────────────────────────────────────────

    async playTrack(url: string): Promise<void> {
        if (url === this.currentUrl) return;
        this.currentUrl = url;

        const ctx = this.getCtx();
        const buf = await this.loadBuffer(url);
        // If the url changed while we were loading, bail out.
        if (url !== this.currentUrl) return;
        if (!buf) return;

        const incoming = this.activeSlot === 'A' ? this.slotB! : this.slotA!;
        const outgoing = this.activeSlot === 'A' ? this.slotA! : this.slotB!;

        // Stop previous incoming source if still running.
        if (incoming.source) {
            try { incoming.source.stop(); } catch { /* already stopped */ }
            incoming.source = null;
        }

        // Start new source on the incoming slot.
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        src.connect(incoming.gain);
        src.start(0);
        incoming.source = src;

        const now = ctx.currentTime;
        const fadeS = CROSSFADE_MS / 1000;

        // Fade outgoing → 0.
        outgoing.gain.gain.cancelScheduledValues(now);
        outgoing.gain.gain.setValueAtTime(outgoing.gain.gain.value, now);
        outgoing.gain.gain.linearRampToValueAtTime(0, now + fadeS);

        // Fade incoming → AMBIENT_VOLUME.
        incoming.gain.gain.cancelScheduledValues(now);
        incoming.gain.gain.setValueAtTime(0, now);
        incoming.gain.gain.linearRampToValueAtTime(AMBIENT_VOLUME, now + fadeS);

        this.activeSlot = this.activeSlot === 'A' ? 'B' : 'A';

        // Stop outgoing source after fade.
        setTimeout(() => {
            if (outgoing.source) {
                try { outgoing.source.stop(); } catch { /* ok */ }
                outgoing.source = null;
            }
        }, CROSSFADE_MS + 100);
    }

    fadeOut(): void {
        this.currentUrl = null;
        const ctx = this.getCtx();
        const now = ctx.currentTime;
        const fadeS = CROSSFADE_MS / 1000;

        for (const slot of [this.slotA, this.slotB]) {
            if (!slot) continue;
            slot.gain.gain.cancelScheduledValues(now);
            slot.gain.gain.setValueAtTime(slot.gain.gain.value, now);
            slot.gain.gain.linearRampToValueAtTime(0, now + fadeS);
        }

        setTimeout(() => {
            for (const slot of [this.slotA, this.slotB]) {
                if (!slot?.source) continue;
                try { slot.source.stop(); } catch { /* ok */ }
                slot.source = null;
            }
        }, CROSSFADE_MS + 100);
    }

    // ── Chime ─────────────────────────────────────────────────────────────────

    /**
     * Play a one-shot chime. `pan` is -1 (hard left) to +1 (hard right).
     * Pass the artifact world X position; we'll normalise against the 8-unit
     * room width so it feels like it comes from the artifact's wall position.
     */
    async playChime(pan = 0): Promise<void> {
        const ctx = this.getCtx();
        const buf = await this.loadBuffer('/audio/chime.mp3');
        if (!buf) return;

        const panner = ctx.createStereoPanner();
        panner.pan.value = Math.max(-0.8, Math.min(0.8, pan));

        const gain = ctx.createGain();
        gain.gain.value = CHIME_VOLUME;

        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(gain);
        gain.connect(panner);
        panner.connect(ctx.destination);
        src.start(0);
    }
}

export const audioEngine = new AudioEngine();

/**
 * Call this on artifact click. Pass the artifact's world X position (0–8)
 * so the chime pans to match where on the wall it sits.
 */
export function playArtifactChime(worldX?: number): void {
    const pan = worldX !== undefined ? (worldX - 4) / 4 : 0;
    void audioEngine.playChime(pan);
}
