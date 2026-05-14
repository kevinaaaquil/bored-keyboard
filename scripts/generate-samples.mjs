import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../public/sounds/demo-keys");

/** Equal temperament A4 = 440 Hz */
const notes = {
  C4: 261.6255653005986,
  D4: 293.6647679174076,
  E4: 329.62755691287,
  F4: 349.2282314330039,
  G4: 391.99543598174927,
  A4: 440,
  B4: 493.8833013781249,
  C5: 523.2511306011974,
  D5: 587.3295358348151,
  E5: 659.2551138257398,
};

function genSamples(freq, seconds, sampleRate) {
  const n = Math.floor(seconds * sampleRate);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-3.4 * t);
    const fundamental = Math.sin(2 * Math.PI * freq * t);
    const h2 = 0.32 * Math.sin(2 * Math.PI * freq * 2 * t);
    const h3 = 0.1 * Math.sin(2 * Math.PI * freq * 3 * t);
    const h4 = 0.05 * Math.sin(2 * Math.PI * freq * 4 * t);
    samples[i] = env * (fundamental + h2 + h3 + h4) * 0.42;
  }
  return samples;
}

function floatTo16Buffer(floatSamples) {
  const buf = Buffer.alloc(floatSamples.length * 2);
  for (let i = 0; i < floatSamples.length; i++) {
    const s = Math.max(-1, Math.min(1, floatSamples[i]));
    const v = s < 0 ? s * 0x8000 : s * 0x7fff;
    buf.writeInt16LE(v | 0, i * 2);
  }
  return buf;
}

function writeWav(path, floatSamples, sampleRate) {
  const pcm = floatTo16Buffer(floatSamples);
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm.length;
  const bufferSize = 44 + dataSize;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(bufferSize - 8, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  writeFileSync(path, Buffer.concat([header, pcm]));
}

const sampleRate = 44100;
const seconds = 1.35;

mkdirSync(outDir, { recursive: true });
for (const [note, freq] of Object.entries(notes)) {
  const f = genSamples(freq, seconds, sampleRate);
  writeWav(join(outDir, `${note}.wav`), f, sampleRate);
  console.log("wrote", note);
}
