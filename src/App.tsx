import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CompositeEngine } from "./audio/CompositeEngine";
import { clearInstrumentCache } from "./audio/loader";
import { instruments, getInstrument } from "./data/instruments";
import type { DigitKey } from "./data/notes";
import { resolveDigit, resolveKey } from "./layout/resolver";
import { InstrumentSelector } from "./components/InstrumentSelector";
import { KeyboardPad } from "./components/KeyboardPad";
import { StatusBar } from "./components/StatusBar";
import { VolumeControl } from "./components/VolumeControl";
import { AttributionPanel } from "./components/AttributionPanel";
import "./index.css";

const defaultInstrumentId = instruments[0]!.id;

function linearToGain(linear: number): number {
  const x = Math.max(0, Math.min(1, linear));
  return x * x;
}

export default function App() {
  const engineRef = useRef(new CompositeEngine());
  const activeIdRef = useRef(defaultInstrumentId);
  const loadedIdRef = useRef<string | null>(null);
  const keyTimersRef = useRef<Map<DigitKey, ReturnType<typeof setTimeout>>>(new Map());
  const keyPressStartRef = useRef<Map<DigitKey, number>>(new Map());

  const [activeInstrumentId, setActiveInstrumentId] = useState(defaultInstrumentId);
  const [audioReady, setAudioReady] = useState(false);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error">("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadStateRef = useRef(loadState);
  loadStateRef.current = loadState;
  const [pressed, setPressed] = useState<Set<DigitKey>>(() => new Set());
  const [volumeLinear, setVolumeLinear] = useState(0.55);
  const [attributionOpen, setAttributionOpen] = useState(false);

  const activeInstrument = getInstrument(activeInstrumentId);

  useEffect(() => {
    activeIdRef.current = activeInstrumentId;
  }, [activeInstrumentId]);

  const applyVolume = useCallback((linear: number) => {
    engineRef.current.setMasterGain(linearToGain(linear));
  }, []);

  useEffect(() => {
    if (audioReady) applyVolume(volumeLinear);
  }, [audioReady, volumeLinear, applyVolume]);

  const ensureLoaded = useCallback(
    async (instrumentId: string, opts?: { clearCache?: boolean; showLoading?: boolean }) => {
      const engine = engineRef.current;
      const showLoading = opts?.showLoading !== false;
      if (opts?.clearCache) {
        clearInstrumentCache(instrumentId);
        if (loadedIdRef.current === instrumentId) loadedIdRef.current = null;
      }

      const already = loadedIdRef.current === instrumentId && !opts?.clearCache;
      if (!already && showLoading) {
        setLoadState("loading");
        setLoadError(null);
      }

      try {
        await engine.init();
        if (!already || opts?.clearCache) {
          await engine.loadInstrument(instrumentId);
        }
        engine.setActiveInstrument(instrumentId);
        loadedIdRef.current = instrumentId;
        setActiveInstrumentId(instrumentId);
        setAudioReady(true);
        setLoadState("idle");
      } catch (e) {
        setLoadState("error");
        setLoadError(e instanceof Error ? e.message : "Unknown error");
        throw e;
      }
    },
    [],
  );

  const clearKeyTimer = useCallback((digit: DigitKey) => {
    const t = keyTimersRef.current.get(digit);
    if (t) clearTimeout(t);
    keyTimersRef.current.delete(digit);
  }, []);

  const scheduleKeyRelease = useCallback(
    (digit: DigitKey, start: number) => {
      clearKeyTimer(digit);
      const elapsed = Date.now() - start;
      const wait = Math.max(0, 150 - elapsed);
      const id = setTimeout(() => {
        setPressed((prev) => {
          const next = new Set(prev);
          next.delete(digit);
          return next;
        });
        keyTimersRef.current.delete(digit);
      }, wait);
      keyTimersRef.current.set(digit, id);
    },
    [clearKeyTimer],
  );

  useEffect(() => {
    return () => {
      for (const t of keyTimersRef.current.values()) clearTimeout(t);
      keyTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (loadStateRef.current === "loading") return;

      const digit = resolveDigit(event);
      if (!digit) return;

      const inst = getInstrument(activeIdRef.current);
      if (!inst) return;
      const note = resolveKey(event, inst);
      if (!note) return;

      clearKeyTimer(digit);
      keyPressStartRef.current.set(digit, Date.now());
      setPressed((prev) => new Set(prev).add(digit));

      void (async () => {
        try {
          await ensureLoaded(activeIdRef.current, { showLoading: loadedIdRef.current !== activeIdRef.current });
          engineRef.current.play(note);
        } catch {
          setPressed((prev) => {
            const next = new Set(prev);
            next.delete(digit);
            return next;
          });
        }
      })();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const digit = resolveDigit(event);
      if (!digit) return;
      const start = keyPressStartRef.current.get(digit) ?? Date.now();
      keyPressStartRef.current.delete(digit);
      scheduleKeyRelease(digit, start);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [clearKeyTimer, ensureLoaded, scheduleKeyRelease]);

  const onSelectInstrument = useCallback(
    async (id: string) => {
      try {
        await ensureLoaded(id, { showLoading: true });
      } catch {
        /* surfaced via loadState */
      }
    },
    [ensureLoaded],
  );

  const onPadPress = useCallback(
    async (digit: DigitKey) => {
      const inst = getInstrument(activeIdRef.current);
      if (!inst || loadStateRef.current === "loading") return;
      const note = inst.defaultKeyMap[digit];
      if (!note) return;
      try {
        await ensureLoaded(activeIdRef.current, { showLoading: loadedIdRef.current !== activeIdRef.current });
        engineRef.current.play(note);
      } catch {
        /* error state */
      }
    },
    [ensureLoaded],
  );

  const onRetry = useCallback(() => {
    void ensureLoaded(activeInstrumentId, { clearCache: true, showLoading: true });
  }, [activeInstrumentId, ensureLoaded]);

  const rootStyle = {
    "--accent": activeInstrument?.accent ?? "#D4F542",
  } as CSSProperties;

  const padDisabled = loadState === "loading" || loadState === "error";

  return (
    <>
      <div className="viewport-notice" role="status" aria-live="polite">
        <div className="viewport-notice__inner">
          <h1 className="viewport-notice__title">Desktop recommended</h1>
          <p className="viewport-notice__body">
            This website is designed to be used on a desktop-sized screen. You will get a much better experience if you open it on a desktop or laptop
            computer.
          </p>
        </div>
      </div>

      <div className="viewport-app">
        <div className="app" style={rootStyle}>
          <header className="app__header">
            <h1 className="app__title">Bored Keyboard</h1>
            <p className="app__tagline">Press 0–9. Tap keys. Switch sounds.</p>
          </header>

          <InstrumentSelector
            instruments={instruments}
            activeId={activeInstrumentId}
            disabled={loadState === "loading"}
            onSelect={onSelectInstrument}
          />

          <KeyboardPad
            instrument={activeInstrument ?? instruments[0]!}
            pressed={pressed}
            disabled={padDisabled}
            loading={loadState === "loading"}
            onPress={onPadPress}
            onPressVisual={setPressed}
          />

          <VolumeControl value={volumeLinear} onChange={setVolumeLinear} disabled={!audioReady} />

          <StatusBar
            loadState={loadState}
            instrumentName={activeInstrument?.name ?? ""}
            errorMessage={loadError}
            onRetry={onRetry}
          />

          <footer className="app__footer">
            <button type="button" className="link-button" onClick={() => setAttributionOpen(true)}>
              Attributions & licenses
            </button>
          </footer>

          {attributionOpen ? <AttributionPanel onClose={() => setAttributionOpen(false)} /> : null}
        </div>
      </div>
    </>
  );
}
