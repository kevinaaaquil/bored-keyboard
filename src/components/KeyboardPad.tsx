import { useCallback, useEffect, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Instrument } from "../data/instruments";
import type { DigitKey, NoteName } from "../data/notes";

const ROW1: DigitKey[] = ["0", "1", "2", "3", "4"];
const ROW2: DigitKey[] = ["5", "6", "7", "8", "9"];

const MIN_VISUAL_MS = 150;

type Props = {
  instrument: Instrument;
  pressed: Set<DigitKey>;
  disabled: boolean;
  loading: boolean;
  onPress: (digit: DigitKey) => void | Promise<void>;
  onPressVisual: (updater: (prev: Set<DigitKey>) => Set<DigitKey>) => void;
};

export function KeyboardPad({
  instrument,
  pressed,
  disabled,
  loading,
  onPress,
  onPressVisual,
}: Props) {
  const timersRef = useRef<Map<DigitKey, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimer = useCallback((digit: DigitKey) => {
    const t = timersRef.current.get(digit);
    if (t) clearTimeout(t);
    timersRef.current.delete(digit);
  }, []);

  const releaseVisual = useCallback(
    (digit: DigitKey) => {
      onPressVisual((prev) => {
        const next = new Set(prev);
        next.delete(digit);
        return next;
      });
    },
    [onPressVisual],
  );

  const scheduleRelease = useCallback(
    (digit: DigitKey, start: number) => {
      clearTimer(digit);
      const elapsed = Date.now() - start;
      const wait = Math.max(0, MIN_VISUAL_MS - elapsed);
      const id = setTimeout(() => {
        releaseVisual(digit);
        timersRef.current.delete(digit);
      }, wait);
      timersRef.current.set(digit, id);
    },
    [clearTimer, releaseVisual],
  );

  useEffect(() => {
    return () => {
      for (const t of timersRef.current.values()) clearTimeout(t);
      timersRef.current.clear();
    };
  }, []);

  const pressStartRef = useRef<Map<DigitKey, number>>(new Map());

  const beginDigit = useCallback(
    (digit: DigitKey) => {
      if (disabled) return;
      clearTimer(digit);
      const start = Date.now();
      pressStartRef.current.set(digit, start);
      onPressVisual((prev) => new Set(prev).add(digit));
      void onPress(digit);
    },
    [clearTimer, disabled, onPress, onPressVisual],
  );

  const endDigit = useCallback(
    (digit: DigitKey) => {
      const start = pressStartRef.current.get(digit) ?? Date.now();
      pressStartRef.current.delete(digit);
      clearTimer(digit);
      scheduleRelease(digit, start);
    },
    [clearTimer, scheduleRelease],
  );

  const onPointerDown = (digit: DigitKey) => () => beginDigit(digit);
  const onPointerUp = (digit: DigitKey) => () => endDigit(digit);
  const onPointerLeave = (digit: DigitKey) => () => {
    if (pressed.has(digit)) endDigit(digit);
  };

  const onKeyActivate = (digit: DigitKey) => (event: ReactKeyboardEvent) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      beginDigit(digit);
    }
  };

  const onKeyRelease = (digit: DigitKey) => (event: ReactKeyboardEvent) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      endDigit(digit);
    }
  };

  const renderKey = (digit: DigitKey) => {
    const note = instrument.defaultKeyMap[digit] as NoteName;
    const isPressed = pressed.has(digit);
    return (
      <button
        key={digit}
        type="button"
        className={`key ${isPressed ? "key--pressed" : ""}`}
        disabled={disabled}
        aria-label={`Key ${digit}, ${note}`}
        onPointerDown={onPointerDown(digit)}
        onPointerUp={onPointerUp(digit)}
        onPointerCancel={onPointerUp(digit)}
        onPointerLeave={onPointerLeave(digit)}
        onKeyDown={onKeyActivate(digit)}
        onKeyUp={onKeyRelease(digit)}
      >
        <span className="key__digit">{digit}</span>
        <span className="key__note">{note}</span>
      </button>
    );
  };

  return (
    <div className={`keyboard-pad ${loading ? "keyboard-pad--loading" : ""}`} aria-busy={loading}>
      <div className="keyboard-pad__row">{ROW1.map(renderKey)}</div>
      <div className="keyboard-pad__row">{ROW2.map(renderKey)}</div>
    </div>
  );
}
