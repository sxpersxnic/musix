import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const ANALYSIS_SAMPLE_RATE = 44100;
const MAX_BUFFER_SIZE = 128 * 1024 * 1024;

export interface DecodeAudioFileOptions {
	maxDurationSeconds?: number;
	sampleRate?: number;
}

export async function decodeAudioFile(filePath: string, options: DecodeAudioFileOptions = {}): Promise<Float32Array> {
	const sampleRate = options.sampleRate ?? ANALYSIS_SAMPLE_RATE;
	const args = [
		"-hide_banner",
		"-loglevel",
		"error",
		"-nostdin",
		"-i",
		filePath,
		"-vn",
		"-ac",
		"1",
		"-ar",
		sampleRate.toString(),
		"-f",
		"f32le",
	];

	if (options.maxDurationSeconds !== undefined) {
		args.push("-t", options.maxDurationSeconds.toString());
	}

	args.push("pipe:1");

	try {
		const { stdout } = await execFileAsync("ffmpeg", args, {
			encoding: "buffer",
			maxBuffer: MAX_BUFFER_SIZE,
		});
		return bufferToFloat32Array(stdout);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to decode audio file "${filePath}": ${message}`);
	}
}

function bufferToFloat32Array(buffer: Buffer): Float32Array {
	const sampleCount = Math.floor(buffer.byteLength / Float32Array.BYTES_PER_ELEMENT);
	const samples = new Float32Array(sampleCount);
	const view = new DataView(buffer.buffer, buffer.byteOffset, sampleCount * Float32Array.BYTES_PER_ELEMENT);

	for (let index = 0; index < sampleCount; index += 1) {
		samples[index] = view.getFloat32(index * Float32Array.BYTES_PER_ELEMENT, true);
	}

	return samples;
}