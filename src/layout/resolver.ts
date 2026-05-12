import type { Instrument } from "../data/instruments";
import type { DigitKey, NoteName } from "../data/notes";

const CODE_TO_DIGIT: Record<string, DigitKey> = {
  Digit0: "0",
  Digit1: "1",
  Digit2: "2",
  Digit3: "3",
  Digit4: "4",
  Digit5: "5",
  Digit6: "6",
  Digit7: "7",
  Digit8: "8",
  Digit9: "9",
};

export function resolveDigit(event: KeyboardEvent): DigitKey | null {
  return CODE_TO_DIGIT[event.code] ?? null;
}

/**
 * Pure mapping from physical key to note using `event.code` (layout-stable).
 */
export function resolveKey(event: KeyboardEvent, instrument: Instrument): NoteName | null {
  const digit = resolveDigit(event);
  if (!digit) return null;
  return instrument.defaultKeyMap[digit] ?? null;
}
