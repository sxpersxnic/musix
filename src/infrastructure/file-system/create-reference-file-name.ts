import slugify from "slugify";

export interface CreateReferenceFileNameParameters {
	artist: string;
	title: string;
	bpm?: number;
	musicalKey?: string;
}

export function createReferenceFileName(
	parameters: CreateReferenceFileNameParameters,
): string {
	const artistSlug = slugMusic(parameters.artist);
	const titleSlug = slugMusic(parameters.title);

	const bpm = parameters.bpm?.toString() ?? "unknown";

	const musicalKey = parameters.musicalKey?.toLowerCase() ?? "unknown";

	return `${bpm}_${musicalKey}_${artistSlug}_${titleSlug}.mp3`;
}

function slugMusic(value: string): string {
	return slugify(normalizeMusicText(value), {
		lower: true,
		strict: true,
		trim: true,
	});
}

function normalizeMusicText(value: string): string {
	return value
		.replace(/\$/g, "s")
		.replace(/&/g, "and")
		.replace(/@/g, "at")
		.replace(/\+/g, "plus")
		.replace(/feat\./gi, "feat")
		.replace(/ft\./gi, "feat")
		.trim();
}