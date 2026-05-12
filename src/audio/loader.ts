import type { NoteName } from "../data/notes";
import { NOTE_NAMES } from "../data/notes";
import { getInstrument } from "../data/instruments";

const bufferCache = new Map<string, Map<NoteName, AudioBuffer>>();

export async function preloadInstrument(ctx: AudioContext, instrumentId: string): Promise<void> {
  const inst = getInstrument(instrumentId);
  if (!inst || inst.kind !== "sampler") return;

  const existing = bufferCache.get(instrumentId);
  if (existing && existing.size === NOTE_NAMES.length) return;

  const map = new Map<NoteName, AudioBuffer>();
  await Promise.all(
    NOTE_NAMES.map(async (note) => {
      const url = inst.samples[note];
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
      const raw = await res.arrayBuffer();
      const copy = raw.slice(0);
      const decoded = await ctx.decodeAudioData(copy);
      map.set(note, decoded);
    }),
  );
  bufferCache.set(instrumentId, map);
}

export function getBuffer(_ctx: AudioContext, instrumentId: string, note: NoteName): AudioBuffer | undefined {
  return bufferCache.get(instrumentId)?.get(note);
}

export function clearInstrumentCache(instrumentId: string): void {
  bufferCache.delete(instrumentId);
}
