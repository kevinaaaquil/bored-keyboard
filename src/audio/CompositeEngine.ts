import type { NoteName } from "../data/notes";
import type { AudioEngine } from "./AudioEngine";
import { getInstrument } from "../data/instruments";
import { OscillatorEngine } from "./OscillatorEngine";
import { SamplerEngine } from "./SamplerEngine";
import { preloadInstrument } from "./loader";

/**
 * Single AudioContext, routes play/stop to oscillator or sampler based on active instrument.
 */
export class CompositeEngine implements AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private osc: OscillatorEngine | null = null;
  private sampler: SamplerEngine | null = null;
  private activeInstrumentId: string | null = null;

  async init(): Promise<void> {
    if (this.ctx) {
      await this.ctx.resume();
      return;
    }
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);

    this.ctx = ctx;
    this.masterGain = master;
    this.osc = new OscillatorEngine(ctx, master);
    this.sampler = new SamplerEngine(ctx, master);
  }

  async loadInstrument(id: string): Promise<void> {
    await this.init();
    const inst = getInstrument(id);
    if (!inst) throw new Error(`Unknown instrument: ${id}`);
    if (inst.kind === "sampler") {
      await preloadInstrument(this.ctx!, id);
    }
  }

  setActiveInstrument(id: string): void {
    this.activeInstrumentId = id;
    const inst = getInstrument(id);
    if (!inst) return;
    if (inst.kind === "oscillator") {
      this.osc?.setTimbre(inst.waveform, inst.retrigger);
    } else {
      this.sampler?.setActiveInstrument(id);
      this.sampler?.setRetrigger(inst.retrigger);
    }
  }

  play(note: NoteName, opts?: { velocity?: number }): void {
    const inst = this.activeInstrumentId ? getInstrument(this.activeInstrumentId) : undefined;
    if (!inst) return;
    if (inst.kind === "oscillator") {
      this.osc?.play(note, opts);
    } else {
      this.sampler?.play(note, opts);
    }
  }

  stop(note: NoteName): void {
    const inst = this.activeInstrumentId ? getInstrument(this.activeInstrumentId) : undefined;
    if (!inst) return;
    if (inst.kind === "oscillator") {
      this.osc?.stop(note);
    } else {
      this.sampler?.stop(note);
    }
  }

  setMasterGain(value: number): void {
    if (!this.masterGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(value, now + 0.02);
  }
}
