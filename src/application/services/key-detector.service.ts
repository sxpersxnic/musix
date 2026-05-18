import { Note, ClassicalKey, CamelotKey } from "../../domain/types/music.types.js";
import { decodeAudioFile, ANALYSIS_SAMPLE_RATE } from "../../infrastructure/audio/decode-audio-file.js";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const satisfies readonly Note[];
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const KEY_ANALYSIS_WINDOW_SIZE = 8192;
const KEY_ANALYSIS_HOP_SIZE = 8192;
const KEY_ANALYSIS_DURATION_SECONDS = 120;

const CAMELOT_BY_CLASSICAL: Record<ClassicalKey, CamelotKey> = {
  C: "8B",
  "C#": "3B",
  D: "10B",
  "D#": "5B",
  E: "12B",
  F: "7B",
  "F#": "2B",
  G: "9B",
  "G#": "4B",
  A: "11B",
  "A#": "6B",
  B: "1B",
  Cm: "5A",
  "C#m": "12A",
  Dm: "7A",
  "D#m": "2A",
  Em: "9A",
  Fm: "4A",
  "F#m": "11A",
  Gm: "6A",
  "G#m": "1A",
  Am: "8A",
  "A#m": "3A",
  Bm: "10A",
};

interface FrequencyBinMapping {
  pitchClassIndex: number;
  weight: number;
}

interface KeyResult {
  classicalKey: ClassicalKey;
  camelotKey: CamelotKey;
  score: number;
}

function readValue(array: ArrayLike<number>, index: number): number {
	return array[index] ?? 0;
}

export class KeyDetectorService {
  public async detect(filePath: string): Promise<string> {
    const samples = await decodeAudioFile(filePath, {
      maxDurationSeconds: KEY_ANALYSIS_DURATION_SECONDS,
      sampleRate: ANALYSIS_SAMPLE_RATE,
    });

    if (samples.length === 0) {
      throw new Error(`Unable to detect key for "${filePath}" because no audio samples were decoded.`);
    }

    const keyResult = estimateKey(samples);
    return keyResult.classicalKey;
  }
}

export { KeyDetectorService as KeyFinderService };

function estimateKey(samples: Float32Array): KeyResult {
  const frequencyMap = buildFrequencyMap(KEY_ANALYSIS_WINDOW_SIZE, ANALYSIS_SAMPLE_RATE);
  const real = new Float64Array(KEY_ANALYSIS_WINDOW_SIZE);
  const imag = new Float64Array(KEY_ANALYSIS_WINDOW_SIZE);
  const window = createHannWindow(KEY_ANALYSIS_WINDOW_SIZE);
  const profile = new Float64Array(12);

  for (let start = 0; start + KEY_ANALYSIS_WINDOW_SIZE <= samples.length; start += KEY_ANALYSIS_HOP_SIZE) {
    let windowEnergy = 0;

    for (let index = 0; index < KEY_ANALYSIS_WINDOW_SIZE; index += 1) {
      const value = readValue(samples, start + index) * readValue(window, index);
      real[index] = value;
      imag[index] = 0;
      windowEnergy += value * value;
    }

    if (windowEnergy < 1e-8) {
      continue;
    }

    fft(real, imag);

    for (let bin = 1; bin < frequencyMap.length; bin += 1) {
      const mapping = frequencyMap[bin];
      if (!mapping) {
        continue;
      }

      const realValue = readValue(real, bin);
      const imagValue = readValue(imag, bin);
      const magnitude = Math.sqrt(realValue * realValue + imagValue * imagValue);
      if (magnitude <= 0) {
        continue;
      }

      const pitchClassIndex = mapping.pitchClassIndex;
      profile[pitchClassIndex] = readValue(profile, pitchClassIndex) + magnitude * mapping.weight;
    }
  }

  const profileTotal = profile.reduce((sum, value) => sum + value, 0);
  if (profileTotal <= 0) {
    throw new Error("Unable to detect key because the audio signal was too quiet or too short.");
  }

  const normalizedProfile = Array.from(profile, (value) => value / profileTotal);
  let bestResult: KeyResult | undefined;

  for (const scale of ["major", "minor"] as const) {
    const template = scale === "major" ? MAJOR_PROFILE : MINOR_PROFILE;

    for (let rootIndex = 0; rootIndex < NOTE_NAMES.length; rootIndex += 1) {
      const rotatedTemplate = rotateTemplate(template, rootIndex);
      const score = pearsonCorrelation(normalizedProfile, rotatedTemplate);
      const root = NOTE_NAMES[rootIndex];
      const classicalKey = (scale === "major" ? root : `${root}m`) as ClassicalKey;

      if (!bestResult || score > bestResult.score) {
        bestResult = {
          classicalKey,
          camelotKey: CAMELOT_BY_CLASSICAL[classicalKey],
          score,
        };
      }
    }
  }

  if (!bestResult) {
    throw new Error("Unable to detect key.");
  }

  return bestResult;
}

function buildFrequencyMap(windowSize: number, sampleRate: number): Array<FrequencyBinMapping | undefined> {
  const halfWindowSize = windowSize / 2;
  const frequencyMap: Array<FrequencyBinMapping | undefined> = new Array(halfWindowSize + 1);

  for (let bin = 1; bin <= halfWindowSize; bin += 1) {
    const frequency = (bin * sampleRate) / windowSize;
    if (frequency < 27.5 || frequency > 5000) {
      continue;
    }

    const noteNumber = 69 + 12 * Math.log2(frequency / 440);
    const pitchClassIndex = ((Math.round(noteNumber) % 12) + 12) % 12;
    frequencyMap[bin] = {
      pitchClassIndex,
      weight: 1 / Math.sqrt(frequency),
    };
  }

  return frequencyMap;
}

function createHannWindow(size: number): Float64Array {
  const window = new Float64Array(size);

  for (let index = 0; index < size; index += 1) {
    window[index] = 0.5 * (1 - Math.cos((2 * Math.PI * index) / (size - 1)));
  }

  return window;
}

function rotateTemplate(template: readonly number[], shift: number): number[] {
  const rotatedTemplate: number[] = [];

  for (let index = 0; index < template.length; index += 1) {
    rotatedTemplate.push(readValue(template, (index - shift + template.length) % template.length));
  }

  return rotatedTemplate;
}

function pearsonCorrelation(values: readonly number[], template: readonly number[]): number {
  const valueMean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const templateMean = template.reduce((sum, value) => sum + value, 0) / template.length;

  let numerator = 0;
  let valueVariance = 0;
  let templateVariance = 0;

  for (let index = 0; index < values.length; index += 1) {
    const valueDelta = readValue(values, index) - valueMean;
    const templateDelta = readValue(template, index) - templateMean;
    numerator += valueDelta * templateDelta;
    valueVariance += valueDelta * valueDelta;
    templateVariance += templateDelta * templateDelta;
  }

  if (valueVariance <= 0 || templateVariance <= 0) {
    return Number.NEGATIVE_INFINITY;
  }

  return numerator / Math.sqrt(valueVariance * templateVariance);
}

function fft(real: Float64Array, imag: Float64Array): void {
  const size = real.length;
  const levels = Math.log2(size);

  if (!Number.isInteger(levels)) {
    throw new Error(`FFT size must be a power of 2. Received ${size}.`);
  }

  for (let index = 0, reverseIndex = 0; index < size; index += 1) {
    if (reverseIndex > index) {
      const realValue = readValue(real, index);
      const reverseRealValue = readValue(real, reverseIndex);
      const imagValue = readValue(imag, index);
      const reverseImagValue = readValue(imag, reverseIndex);

      real[index] = reverseRealValue;
      real[reverseIndex] = realValue;
      imag[index] = reverseImagValue;
      imag[reverseIndex] = imagValue;
    }

    let mask = size >> 1;
    while (mask >= 1 && (reverseIndex & mask) !== 0) {
      reverseIndex &= ~mask;
      mask >>= 1;
    }
    reverseIndex |= mask;
  }

  for (let blockSize = 2; blockSize <= size; blockSize <<= 1) {
    const halfBlockSize = blockSize >> 1;
    const angularIncrement = (-2 * Math.PI) / blockSize;
    const wMulReal = Math.cos(angularIncrement);
    const wMulImag = Math.sin(angularIncrement);

    for (let blockStart = 0; blockStart < size; blockStart += blockSize) {
      let wReal = 1;
      let wImag = 0;

      for (let index = 0; index < halfBlockSize; index += 1) {
        const evenIndex = blockStart + index;
        const oddIndex = evenIndex + halfBlockSize;

        const evenReal = readValue(real, evenIndex);
        const evenImag = readValue(imag, evenIndex);
        const oddRealInput = readValue(real, oddIndex);
        const oddImagInput = readValue(imag, oddIndex);

        const oddReal = oddRealInput * wReal - oddImagInput * wImag;
        const oddImag = oddRealInput * wImag + oddImagInput * wReal;

        real[oddIndex] = evenReal - oddReal;
        imag[oddIndex] = evenImag - oddImag;
        real[evenIndex] = evenReal + oddReal;
        imag[evenIndex] = evenImag + oddImag;

        const nextWReal = wReal * wMulReal - wImag * wMulImag;
        wImag = wReal * wMulImag + wImag * wMulReal;
        wReal = nextWReal;
      }
    }
  }
}