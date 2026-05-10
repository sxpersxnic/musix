import type { KeySignature } from "../types/music.types.js";

/**
 * Formats a duration in milliseconds to a string in the format "mm:ss".
 * @param ms The duration in milliseconds.
 * @returns A string representing the formatted duration.
 */
export function formatDuration(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

export function formatAudioFileName(artist: string, title: string, keySignature?: KeySignature, bpm?: number): string {
  const sanitize = (input: string) => input.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  const sanitizedArtist = sanitize(artist);
  const sanitizedTitle = sanitize(title);
  return `${sanitizedArtist}-${sanitizedTitle}${keySignature ? `-${keySignature.classicalKey}` : "-unknown"}${bpm ? `-${bpm}` : "-unknown"}.mp3`;
}
