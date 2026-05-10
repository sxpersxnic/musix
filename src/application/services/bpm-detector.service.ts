import { createRequire } from "node:module";

import { ANALYSIS_SAMPLE_RATE, decodeAudioFile } from "@/infrastructure/audio/decode-audio-file.js";

type MusicTempoResult = {
  tempo: number;
};

type MusicTempoConstructor = new (audioData: Float32Array, params?: MusicTempoParameters) => MusicTempoResult;

interface MusicTempoParameters {
  bufferSize?: number;
  hopSize?: number;
  timeStep?: number;
}

const require = createRequire(import.meta.url);
const MusicTempo = require("music-tempo") as MusicTempoConstructor;

const BPM_MIN = 70;
const BPM_MAX = 200;

export class BpmDetectorService {
  public async detect(filePath: string): Promise<number> {
    const samples = await decodeAudioFile(filePath, {
      maxDurationSeconds: 240,
      sampleRate: ANALYSIS_SAMPLE_RATE,
    });

    if (samples.length === 0) {
      throw new Error(`Unable to detect BPM for "${filePath}" because no audio samples were decoded.`);
    }

    const analysis = new MusicTempo(samples, {
      bufferSize: 2048,
      hopSize: 441,
      timeStep: 441 / ANALYSIS_SAMPLE_RATE,
    });

    const tempo = Number(analysis.tempo);
    if (!Number.isFinite(tempo) || tempo <= 0) {
      throw new Error(`Unable to detect BPM for "${filePath}".`);
    }

    return normalizeBpm(tempo);
  }
}

function normalizeBpm(tempo: number): number {
  let bpm = tempo;

  while (bpm < BPM_MIN) {
    bpm *= 2;
  }

  while (bpm > BPM_MAX) {
    bpm /= 2;
  }

  return Math.round(bpm);
}