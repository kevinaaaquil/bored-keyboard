export const NOTE_NAMES = [
  "C4",
  "D4",
  "E4",
  "F4",
  "G4",
  "A4",
  "B4",
  "C5",
  "D5",
  "E5",
] as const;

export type NoteName = (typeof NOTE_NAMES)[number];

export const DIGIT_KEYS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

export type DigitKey = (typeof DIGIT_KEYS)[number];

/** MIDI note number for MVP pitch range (C4 = 60). */
export function noteToMidi(note: NoteName): number {
  const table: Record<NoteName, number> = {
    C4: 60,
    D4: 62,
    E4: 64,
    F4: 65,
    G4: 67,
    A4: 69,
    B4: 71,
    C5: 72,
    D5: 74,
    E5: 76,
  };
  return table[note];
}

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function noteToFrequency(note: NoteName): number {
  return midiToFrequency(noteToMidi(note));
}
