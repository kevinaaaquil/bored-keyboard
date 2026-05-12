import type { NoteName } from "../data/notes";
import { noteToFrequency } from "../data/notes";
import type { OscillatorWaveform } from "../data/instruments";

const FADE_S = 0.008;
const ATTACK_S = 0.005;
const NOTE_DURATION_S = 0.45;
const MAX_VOICES = 16;

type Voice = {
  osc: OscillatorNode;
  gain: GainNode;
  startedAt: number;
};

export class OscillatorEngine {
  private waveform: OscillatorWaveform = "sine";
  private retrigger: "layer" | "restart" = "layer";
  private voicesByNote = new Map<NoteName, Voice[]>();
  private voiceQueue: Voice[] = [];

  constructor(
    private readonly ctx: AudioContext,
    private readonly destination: AudioNode,
  ) {}

  setTimbre(waveform: OscillatorWaveform, retrigger: "layer" | "restart"): void {
    this.waveform = waveform;
    this.retrigger = retrigger;
  }

  play(note: NoteName, opts?: { velocity?: number }): void {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const v = opts?.velocity ?? 1;

    if (this.retrigger === "restart") {
      const existing = this.voicesByNote.get(note);
      if (existing) {
        for (const voice of existing) this.stopVoice(voice, now);
        this.voicesByNote.delete(note);
      }
    }

    this.evictOldestIfNeeded();

    const osc = ctx.createOscillator();
    osc.type = this.waveform;
    osc.frequency.setValueAtTime(noteToFrequency(note), now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(v * 0.35, now + ATTACK_S);
    gain.gain.setValueAtTime(v * 0.35, now + ATTACK_S + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + NOTE_DURATION_S);

    osc.connect(gain);
    gain.connect(this.destination);

    osc.start(now);
    osc.stop(now + NOTE_DURATION_S + FADE_S);

    const voice: Voice = { osc, gain, startedAt: now };
    this.registerVoice(note, voice);

    osc.onended = () => {
      this.unregisterVoice(voice);
    };
  }

  stop(note: NoteName): void {
    const now = this.ctx.currentTime;
    const list = this.voicesByNote.get(note);
    if (!list) return;
    for (const voice of [...list]) this.stopVoice(voice, now);
    this.voicesByNote.delete(note);
  }

  private stopVoice(voice: Voice, now: number): void {
    try {
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(Math.max(voice.gain.gain.value, 0.0001), now);
      voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + FADE_S);
      voice.osc.stop(now + FADE_S + 0.01);
    } catch {
      /* already stopped */
    }
    this.unregisterVoice(voice);
  }

  private registerVoice(note: NoteName, voice: Voice): void {
    const arr = this.voicesByNote.get(note) ?? [];
    arr.push(voice);
    this.voicesByNote.set(note, arr);
    this.voiceQueue.push(voice);
  }

  private unregisterVoice(voice: Voice): void {
    const idx = this.voiceQueue.indexOf(voice);
    if (idx >= 0) this.voiceQueue.splice(idx, 1);
    for (const [note, list] of this.voicesByNote) {
      const i = list.indexOf(voice);
      if (i >= 0) {
        list.splice(i, 1);
        if (list.length === 0) this.voicesByNote.delete(note);
        break;
      }
    }
  }

  private evictOldestIfNeeded(): void {
    while (this.voiceQueue.length >= MAX_VOICES) {
      const oldest = this.voiceQueue[0];
      if (!oldest) break;
      this.stopVoice(oldest, this.ctx.currentTime);
    }
  }
}
