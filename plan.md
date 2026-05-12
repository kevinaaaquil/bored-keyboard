
# Bored Keyboard Frontend Plan

## Goal

Build a frontend-only website where a user presses number keys `0` through `9` to play musical notes. Users can switch between sampled instruments (guitar, violin, sitar, piano, flute, etc.). The MVP is a single-row keyboard; composite multi-row layouts and modifier macros are explicit post-MVP work.

Default mapping (C major across an octave-and-a-bit, shared by all MVP instruments):

| Key | Note |
| --- | --- |
| `0` | C4  |
| `1` | D4  |
| `2` | E4  |
| `3` | F4  |
| `4` | G4  |
| `5` | A4  |
| `6` | B4  |
| `7` | C5  |
| `8` | D5  |
| `9` | E5  |

Each instrument ships its own default mapping so future per-instrument tunings (e.g. sitar in Sa Re Ga Ma Pa Dha Ni) are a data change, not a code change.

## Product Scope

### Core user experience

1. User opens the website.
2. Site displays the current instrument, the 0–9 key layout with note labels, and an instruction to press number keys or click/tap.
3. User selects an instrument.
4. Pressing a number key plays that note immediately on the active instrument.
5. Visual feedback highlights the pressed key.
6. Samples for the active instrument are preloaded so playback feels responsive.

### Frontend-only constraints

- No backend.
- Instrument metadata in static TypeScript modules.
- Audio served as static assets.
- Hostable on GitHub Pages, Netlify, Vercel, Cloudflare Pages, etc.

## Technical Approach

### Stack

- Vite for dev server and static build.
- React + TypeScript (small enough to stay simple, big enough to benefit from components).
- Web Audio API directly — no Tone.js or Howler for MVP. Revisit if sampler ergonomics become painful.

### Engine abstraction (important)

The audio engine exposes a stable interface so the post-MVP composite layout can plug in without rewriting it:

```ts
interface AudioEngine {
  init(): Promise<void>;             // create/resume AudioContext on first user gesture
  loadInstrument(id: string): Promise<void>;
  setActiveInstrument(id: string): void;
  play(note: NoteName, opts?: { velocity?: number }): void;
  stop(note: NoteName): void;        // no-op for one-shot instruments in MVP
  setMasterGain(value: number): void;
}
```

The engine takes a **note**, not a key. The mapping from physical key to note lives in a separate layout resolver. This single decision is what keeps the door open for future multi-row layouts and modifier macros — they extend the resolver, not the engine.

Two engine implementations behind the same interface:

- `OscillatorEngine` — Phase 1 prototype, synthesizes tones with `OscillatorNode` + envelope.
- `SamplerEngine` — Phase 2 onward, plays decoded `AudioBuffer`s.

### Data model

```ts
type NoteName = "C4" | "D4" | "E4" | "F4" | "G4" | "A4" | "B4" | "C5" | "D5" | "E5";
type DigitKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

type Instrument = {
  id: string;
  name: string;
  description?: string;
  defaultKeyMap: Record<DigitKey, NoteName>;
  samples: Record<NoteName, string>;     // URLs to audio files
  retrigger: "layer" | "restart";        // see Playback behavior
  attribution?: { source: string; license: string; author?: string };
};
```

`NoteName` is a string union for MVP simplicity. If pitch-shifting becomes needed (post-MVP, once macros allow ±semitone), switch the internal representation to MIDI numbers — note names stay only as filenames and display labels.

### Layout resolver

A pure function from `KeyboardEvent` to a note (or nothing):

```ts
function resolveKey(event: KeyboardEvent, instrument: Instrument): NoteName | null;
```

Use `event.code` (`"Digit0"`, `"Digit1"`, …), not `event.key`, so non-US keyboard layouts work correctly.

### Playback behavior

- Create the `AudioContext` lazily on first user gesture (key press, button click, or instrument selection). Reuse a single context for the app's lifetime.
- On `keydown`:
  - Ignore `event.repeat === true` (OS key-repeat would otherwise machine-gun the sample).
  - Resolve the note via the layout resolver.
  - Call `engine.play(note)`.
- Per-instrument retrigger policy:
  - `layer` for plucked/struck instruments (piano, guitar) — new presses spawn a new voice and overlap naturally.
  - `restart` for sustained instruments (violin, flute) — new press stops the existing voice on that note first.
- Apply a short fade-in/out on the gain node (~5–10ms) to avoid clicks.
- Cap concurrent voices at a reasonable number (e.g. 16) with oldest-voice-stolen on overflow.

### Instrument loading

Load on selection, cache after first load:

1. On instrument switch, fetch each sample URL and `decodeAudioData` into `AudioBuffer`s.
2. Store decoded buffers keyed by instrument id.
3. Show a loading state in the UI during the fetch/decode.
4. Subsequent switches to a cached instrument are instant.

Do not lazy-load samples on first keypress — the first press of each note would be silent or late.

## Sound Sourcing

Licensing is the project's biggest risk. Every shipped sample needs a documented license.

### Strategy

1. **Phase 1**: ship `OscillatorEngine` only. UI and interaction are fully testable without any sample files.
2. **Phase 2**: add one real instrument (piano or guitar) from a clearly licensed source. Build the attribution surface alongside it.
3. **Phase 3+**: add more instruments only after confirming redistribution rights.

### Source options to evaluate

- **SoundFont-based**: pick a permissively-licensed SoundFont (FluidR3, GeneralUser GS, MusyngKite), render notes C4–E5 with FluidSynth, trim/normalize/encode. Most efficient route to many instruments.
- **In-browser SoundFont players** (`smplr`, `soundfont-player`): skip the build pipeline entirely. Worth a serious look — they ship ~150 instruments under existing permissive licenses.
- **Sample libraries**: Freesound (license per sound), Philharmonia, University of Iowa MIS, OpenGameArt, Wikimedia Commons, VSCO Community Edition. Verify license per source.
- **Original recordings**: record notes with consistent mic/gain, trim, normalize, encode.

### License hygiene

For each sample source, record in `public/ATTRIBUTION.md`:

- Source URL
- License (prefer CC0 or CC-BY; avoid NC if site might ever be monetized)
- Required attribution string
- Instrument and note names
- Edits performed (trim, normalize, format conversion)

### Asset format

- Primary: Opus in `.webm` (smaller than mp3 at same quality, supported everywhere except very old Safari).
- Fallback: `.mp3` if a target browser doesn't support Opus.
- Mono, ~1–3 seconds, leading silence trimmed, loudness normalized across the set.
- Path convention: `public/sounds/<instrument>/<note>.webm`.

## Design Plan

### Design direction

Bold, tactile, minimal in palette. The product is a toy — pressing keys should feel satisfying — so the keys are the visual hero: large, chunky, with real depth. Everything else recedes. Dark mode by default to make the accent color punch and to feel more like an instrument than an office app.

Mood references: hardware synthesizers (chunky buttons, clear labels), arcade cabinets (confident typography, tactile feedback), modern dev tools (restrained palette, monospace flourishes).

### Color system

Defined as CSS custom properties so per-instrument theming is a single variable swap:

```css
:root {
  --bg:          #0F0E0E;  /* near-black, warm */
  --surface:     #1A1817;  /* keys at rest */
  --surface-2:   #2A2624;  /* hover / raised */
  --border:      #3A3431;
  --text:        #F2EDE6;  /* warm off-white */
  --text-muted:  #8B847A;
  --accent:      #D4F542;  /* vivid yellow-green, default */
  --accent-dim:  rgba(212, 245, 66, 0.15);
  --error:       #FF6B35;
}
```

Each instrument can override `--accent` for instant theming (guitar = warm amber, piano = cool teal, sitar = saffron, flute = pale cyan, etc.). Only the accent changes per instrument — surfaces stay constant so switching feels like a color change, not a redesign.

### Typography

- **Display / key digits**: Space Grotesk 700, or JetBrains Mono 700 if a more "instrument" feel is wanted. Used for the big `0`–`9` and the app title.
- **Body / UI**: Inter 400–500, or system sans.
- **Note labels** (under digits): Inter 500, smaller and muted.

Both fonts loaded via `@fontsource/*` for offline-friendly static hosting, with system fallbacks.

### Layout

**Desktop (≥768px)** — centered single column, max width ~720px:

```
┌────────────────────────────────────────┐
│            BORED KEYBOARD              │
│                                        │
│   [Guitar] [Piano] [Sitar]   [●● load] │
│                                        │
│   ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐              │
│   │ 0│ │ 1│ │ 2│ │ 3│ │ 4│              │
│   │C4│ │D4│ │E4│ │F4│ │G4│              │
│   └──┘ └──┘ └──┘ └──┘ └──┘              │
│   ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐              │
│   │ 5│ │ 6│ │ 7│ │ 8│ │ 9│              │
│   │A4│ │B4│ │C5│ │D5│ │E5│              │
│   └──┘ └──┘ └──┘ └──┘ └──┘              │
│                                        │
│   🔈 ──────●─────────── 🔊              │
│                                        │
│   Press number keys to play            │
│   Attributions                         │
└────────────────────────────────────────┘
```

Keys are arranged 5×2 by default, not 10×1 — fits the screen, mirrors a folded number row, and works on mobile without relayout.

**Mobile (<768px)** — same vertical stack. Keys stay 5×2 with larger relative touch targets (minimum 64–72px square). Instrument selector collapses to a dropdown if more than 4 instruments are available.

### Component specs

**Keyboard pad**
- Grid: 5 columns × 2 rows, 12–16px gap.
- Each key: square, 96–120px on desktop, 64–72px on mobile, minimum 44×44px (WCAG AAA touch target).
- Background `--surface`, 1px `--border`, border-radius 12px.
- Subtle inner highlight on the top edge (`inset 0 1px 0 rgba(255,255,255,0.04)`) and a 2–3px drop shadow below for elevation.
- Digit: 48–64px, `--text`, centered in the upper two-thirds.
- Note label: 13–14px, `--text-muted`, centered in the lower third.
- **Pressed**: scale to 0.97, drop shadow collapses, background shifts to `--accent-dim`, border becomes `--accent`. The whole key reads as physically depressed.
- **Hover** (desktop only): background `--surface-2`, border lightens.
- **Focus-visible**: 2px `--accent` outline offset by 2px.

**Instrument selector**
- Pill row on desktop (one button per instrument), dropdown on mobile or when more than ~4 instruments are available.
- Active pill: filled with `--accent`, text in `--bg`.
- Inactive pill: `--surface` background, `--text-muted` text, 1px `--border`.
- Hover: lifts to `--surface-2`.

**Volume control**
- Horizontal range slider, spans the keyboard pad width.
- Track: `--surface-2`. Fill: `--accent`. Thumb: 16px circle, `--accent`.
- Small mute/loud icons at each end in `--text-muted`.
- Exponential or log taper so the perceived range feels even (a linear volume slider feels broken at the low end).

**Status bar**
- One line of text below the volume slider, `--text-muted`.
- Loading: small accent-colored spinner + "Loading [instrument]…"
- Idle: "Press number keys 0–9 to play"
- Error: `--error` color, "Couldn't load [instrument]. Try another." with a retry link.

### Motion

- Key press: 60–80ms ease-out scale and color shift on `pointerdown` / `keydown`.
- Key release: 120ms ease-out return on `pointerup` / `keyup`.
- Instrument switch: 200ms accent crossfade across the pad.
- Loading: gentle pulse on the pad (opacity 0.6 → 1.0, 1.5s loop) while samples decode.
- All animation gated by `prefers-reduced-motion: reduce` — states then change instantly with no scale or pulse.

### State matrix

| State | Pad | Status bar |
|---|---|---|
| Idle (instrument ready) | Interactive, hoverable | "Press number keys 0–9 to play" |
| Loading instrument | Dimmed + pulse, non-interactive | "Loading [instrument]…" |
| Playing (key down) | Pressed key in accent | unchanged |
| Error | Dimmed, non-interactive | Red text + retry |

### Interaction details

- Buttons are real `<button>` elements.
- Use `pointerdown` (not `click`) for tap response — `click` fires on release and feels laggy.
- Apply `touch-action: manipulation` and `user-select: none` to keys to kill the mobile tap delay and prevent text selection on drag.
- Visual press starts on `pointerdown` / `keydown`, ends on `pointerup` / `keyup`, with a ~150ms minimum hold so quick taps still register visually.
- Respect `prefers-reduced-motion` for all animations.

### Accessibility

- Buttons are keyboard-focusable and operable with Space/Enter in addition to the 0–9 shortcuts.
- Instrument selector is fully keyboard-navigable with visible focus states.
- Status changes are announced via an `aria-live="polite"` region.
- Digit and note labels meet WCAG AA contrast against `--surface` and against `--accent-dim` (verify when adding per-instrument accent overrides).
- Loading and error are conveyed by text, not color or shape alone.

## Implementation Phases

### Phase 1: Playable prototype (no samples)

- Vite + React + TS scaffold.
- Layout resolver with `event.code` → note.
- `OscillatorEngine` implementing the `AudioEngine` interface.
- Keyboard pad UI, instrument selector with 2–3 synth presets (sine, triangle, square + envelope).
- Master volume.
- Key-repeat suppression, voice cap, click-avoidance envelope.

Acceptance: pressing 0–9 plays distinct notes, the UI highlights correctly, no console errors, works in current Chrome/Firefox/Safari.

### Phase 2: First sampled instrument

- `SamplerEngine` implementing the same interface.
- Fetch + `decodeAudioData` pipeline with buffer cache.
- Loading and error UI.
- One instrument shipped (piano or guitar) with full attribution.
- Per-instrument retrigger policy plumbed through.

Acceptance: the sampled instrument is selectable, loads with visible state, plays cleanly, attribution is reachable from the UI.

### Phase 3: Multiple instruments

- 3–5 instruments total with documented attribution.
- Loudness normalized across instruments so switching is not jarring.
- Improved loading UX (parallel decode, optimistic UI).

### Phase 4: Polish

- Visual design pass.
- Mobile layout refinements.
- Optional: simple sequence recording/playback, shareable config via URL params.

## Post-MVP Roadmap

These are intentionally **not** part of MVP, but the architecture above accommodates them without rewrites:

- **User-configurable key mappings.** Per-instrument overrides serialized to `localStorage` and URL params. The resolver already reads from `instrument.defaultKeyMap`; user overrides slot in at the same layer.
- **Composite multi-row layouts.** Each physical keyboard row (number row, QWERTY, ASDF, ZXCV) gets its own voice with its own instrument. Engine API stays the same; the resolver becomes `KeyboardEvent → { voiceId, note }` and the engine routes per voice.
- **Modifier macros (sharps/flats, octave shifts).** A held key (likely Tab or `\` — Shift is too entangled with browser behavior) shifts the next note ±1 semitone. Modifiers stack. This forces the internal note representation to switch from `NoteName` strings to MIDI integers, and forces pitch-shifting via `playbackRate = 2 ** (semitones / 12)` on `AudioBufferSourceNode` — at which point instruments can ship sparser samples (every 3–4 semitones) and the engine fills in the rest.
- **Per-voice gain, octave shift, instrument mute.** Natural once voices exist.

The MVP avoids all of this. The one design decision the MVP *must* honor to keep these cheap later: the engine takes notes, not keys.

## Risks and Decisions

- **Sample licensing.** Biggest risk. No sample ships without a documented license and attribution entry.
- **Browser autoplay policies.** `AudioContext` must be created or resumed inside a user-gesture handler. Initialize lazily on first interaction.
- **Latency.** Web Audio with pre-decoded buffers, not `<audio>` elements.
- **Bundle/asset size.** Load instruments on demand; cache only what's been used.
- **Keyboard layout differences.** `event.code` everywhere, never `event.key`, for note dispatch.

## Repository Structure

```text
src/
  App.tsx
  audio/
    AudioEngine.ts            # interface
    OscillatorEngine.ts       # Phase 1
    SamplerEngine.ts          # Phase 2+
    loader.ts                 # fetch + decodeAudioData + cache
  layout/
    resolver.ts               # KeyboardEvent → NoteName
  data/
    instruments.ts            # instrument definitions
    notes.ts                  # NoteName type, helpers
  components/
    InstrumentSelector.tsx
    KeyboardPad.tsx
    StatusBar.tsx
    VolumeControl.tsx
public/
  sounds/
    guitar/
      C4.webm
      D4.webm
      ...
  ATTRIBUTION.md
```

## MVP Acceptance Criteria

- Pressing keys `0`–`9` plays the mapped notes.
- Clicking/tapping on-screen keys plays the same notes.
- User can switch between at least two instruments (one synthesized, one sampled is fine).
- Audio initializes only after a user gesture and works in current Chrome, Firefox, and Safari.
- Held keys do not retrigger from OS key-repeat.
- All shipped samples have license and attribution recorded in `ATTRIBUTION.md` and linked from the UI.
- The app builds to static files and runs with no backend.
- The audio engine interface accepts notes (not keys), with the layout resolver as a separate module.
