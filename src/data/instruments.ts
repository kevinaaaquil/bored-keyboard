import type { DigitKey, NoteName } from "./notes";

const sound = (path: string) => {
  const base = import.meta.env.BASE_URL;
  const normalized = base.endsWith("/") ? base : `${base}/`;
  return `${normalized}${path.replace(/^\//, "")}`;
};

export type RetriggerPolicy = "layer" | "restart";

export type OscillatorWaveform = "sine" | "triangle" | "square";

export type BaseInstrument = {
  id: string;
  name: string;
  description?: string;
  defaultKeyMap: Record<DigitKey, NoteName>;
  retrigger: RetriggerPolicy;
  attribution?: { source: string; license: string; author?: string };
  /** Overrides `--accent` for instrument-themed UI. */
  accent?: string;
};

export type OscillatorInstrument = BaseInstrument & {
  kind: "oscillator";
  waveform: OscillatorWaveform;
};

export type SamplerInstrument = BaseInstrument & {
  kind: "sampler";
  samples: Record<NoteName, string>;
};

export type Instrument = OscillatorInstrument | SamplerInstrument;

const defaultKeyMap: Record<DigitKey, NoteName> = {
  "0": "C4",
  "1": "D4",
  "2": "E4",
  "3": "F4",
  "4": "G4",
  "5": "A4",
  "6": "B4",
  "7": "C5",
  "8": "D5",
  "9": "E5",
};

export const instruments: Instrument[] = [
  {
    id: "sine",
    kind: "oscillator",
    name: "Sine",
    description: "Soft pure tone",
    defaultKeyMap,
    retrigger: "layer",
    waveform: "sine",
    accent: "#7DD3FC",
  },
  {
    id: "triangle",
    kind: "oscillator",
    name: "Triangle",
    description: "Warm mellow synth",
    defaultKeyMap,
    retrigger: "layer",
    waveform: "triangle",
    accent: "#FBBF24",
  },
  {
    id: "square",
    kind: "oscillator",
    name: "Square",
    description: "Bright hollow tone",
    defaultKeyMap,
    retrigger: "restart",
    waveform: "square",
    accent: "#A78BFA",
  },
  {
    id: "demo-keys",
    kind: "sampler",
    name: "Demo Keys",
    description: "Short synthetic key tones (MVP stand-in for a sampled piano)",
    defaultKeyMap,
    retrigger: "layer",
    accent: "#5EEAD4",
    samples: {
      C4: sound("sounds/demo-keys/C4.wav"),
      D4: sound("sounds/demo-keys/D4.wav"),
      E4: sound("sounds/demo-keys/E4.wav"),
      F4: sound("sounds/demo-keys/F4.wav"),
      G4: sound("sounds/demo-keys/G4.wav"),
      A4: sound("sounds/demo-keys/A4.wav"),
      B4: sound("sounds/demo-keys/B4.wav"),
      C5: sound("sounds/demo-keys/C5.wav"),
      D5: sound("sounds/demo-keys/D5.wav"),
      E5: sound("sounds/demo-keys/E5.wav"),
    },
    attribution: {
      source: "Generated in-repo for bored-keyboard MVP (replace with licensed recordings).",
      license: "CC0-1.0 (project-generated waveforms)",
    },
  },
];

export function getInstrument(id: string): Instrument | undefined {
  return instruments.find((i) => i.id === id);
}
