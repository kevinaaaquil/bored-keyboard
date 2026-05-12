import type { NoteName } from "../data/notes";
import { getBuffer, preloadInstrument } from "./loader";

const FADE_S = 0.008;
const MAX_VOICES = 16;

type Voice = {
  src: AudioBufferSourceNode;
  gain: GainNode;
  note: NoteName;
};

export class SamplerEngine {
  private instrumentId: string | null = null;
  private retrigger: "layer" | "restart" = "layer";
  private voices: Voice[] = [];
  private voicesByNote = new Map<NoteName, Voice[]>();

  constructor(
    private readonly ctx: AudioContext,
    private readonly destination: AudioNode,
  ) {}

  async loadInstrument(id: string): Promise<void> {
    await preloadInstrument(this.ctx, id);
    this.instrumentId = id;
  }

  setActiveInstrument(id: string): void {
    this.instrumentId = id;
  }

  setRetrigger(policy: "layer" | "restart"): void {
    this.retrigger = policy;
  }

  play(note: NoteName, opts?: { velocity?: number }): void {
    if (!this.instrumentId) return;
    const buffer = getBuffer(this.ctx, this.instrumentId, note);
    if (!buffer) return;

    const now = this.ctx.currentTime;
    const vel = opts?.velocity ?? 1;

    if (this.retrigger === "restart") {
      const existing = this.voicesByNote.get(note);
      if (existing) {
        for (const v of existing) this.stopVoice(v, now);
        this.voicesByNote.delete(note);
      }
    }

    this.evictOldestIfNeeded();

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vel, now + FADE_S);

    src.connect(gain);
    gain.connect(this.destination);
    src.start(now);

    const voice: Voice = { src, gain, note };
    this.voices.push(voice);
    const list = this.voicesByNote.get(note) ?? [];
    list.push(voice);
    this.voicesByNote.set(note, list);

    src.onended = () => {
      this.removeVoice(voice);
    };
  }

  stop(note: NoteName): void {
    const now = this.ctx.currentTime;
    const list = this.voicesByNote.get(note);
    if (!list) return;
    for (const v of [...list]) this.stopVoice(v, now);
    this.voicesByNote.delete(note);
  }

  private stopVoice(voice: Voice, now: number): void {
    try {
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(Math.max(voice.gain.gain.value, 0.0001), now);
      voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + FADE_S);
      voice.src.stop(now + FADE_S + 0.02);
    } catch {
      /* already stopped */
    }
    this.removeVoice(voice);
  }

  private removeVoice(voice: Voice): void {
    const i = this.voices.indexOf(voice);
    if (i >= 0) this.voices.splice(i, 1);
    const list = this.voicesByNote.get(voice.note);
    if (list) {
      const j = list.indexOf(voice);
      if (j >= 0) list.splice(j, 1);
      if (list.length === 0) this.voicesByNote.delete(voice.note);
    }
  }

  private evictOldestIfNeeded(): void {
    while (this.voices.length >= MAX_VOICES) {
      const oldest = this.voices[0];
      if (!oldest) break;
      this.stopVoice(oldest, this.ctx.currentTime);
    }
  }
}
