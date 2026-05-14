import type { NoteName } from "../data/notes";

export interface AudioEngine {
  init(): Promise<void>;
  loadInstrument(id: string): Promise<void>;
  setActiveInstrument(id: string): void;
  play(note: NoteName, opts?: { velocity?: number }): void;
  stop(note: NoteName): void;
  setMasterGain(value: number): void;
}
