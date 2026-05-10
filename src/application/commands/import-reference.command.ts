import { rename as renameFile } from "node:fs/promises";

import { BpmDetectorService } from "@/application/services/bpm-detector.service.js";
import { KeyDetectorService } from "@/application/services/key-detector.service.js";
import { formatDuration } from "@/domain/utils/format.util.js";
import { buildOutputPath } from "@/domain/utils/path.util.js";
import { createReferenceFileName } from "@/infrastructure/file-system/create-reference-file-name.js";
import { extractTrackId } from "@/infrastructure/spotify/extract-track-id.js";
import { AudioDownloaderService } from "@/infrastructure/downloader/audio-downloader.service.js";
import { SpotifyService } from "@/infrastructure/spotify/spotify.service.js";
import { YouTubeSearchService } from "@/infrastructure/youtube/youtube-search.service.js";
import { Command } from "commander";

export interface ImportReferenceTrack {
	artists: Array<{ name: string }>;
	name: string;
	album?: { name?: string };
	duration_ms: number;
}

export interface ImportReferenceCommandDependencies {
	referencesInboxPath: string;
	extractTrackId: (spotifyUrl: string) => string;
	logger: Pick<Console, "log" | "warn">;
	buildOutputPath: typeof buildOutputPath;
	createReferenceFileName: typeof createReferenceFileName;
	renameFile: typeof renameFile;
	spotifyServiceFactory: () => {
		init(): Promise<void>;
		getTrack(trackId: string): Promise<ImportReferenceTrack>;
	};
	youtubeSearchServiceFactory: () => {
		searchFirstVideo(query: string): Promise<string>;
	};
	audioDownloaderServiceFactory: () => {
		download(url: string, outputPath: string): Promise<void>;
	};
	bpmDetectorServiceFactory: () => {
		detect(filePath: string): Promise<number>;
	};
	keyDetectorServiceFactory: () => {
		detect(filePath: string): Promise<string>;
	};
}

export function createImportReferenceCommand(dependencies: ImportReferenceCommandDependencies): Command {
	const command = new Command("import");

	command.argument("<spotify-url>").action(async (spotifyUrl: string) => {
		await importReferenceTrack(spotifyUrl, dependencies);
	});

	return command;
}

export async function importReferenceTrack(
	spotifyUrl: string,
	dependencies: ImportReferenceCommandDependencies,
): Promise<void> {
	dependencies.logger.log("Importing reference...\n");

	const trackId = dependencies.extractTrackId(spotifyUrl);
	const spotifyService = dependencies.spotifyServiceFactory();

	await spotifyService.init();

	const track = await spotifyService.getTrack(trackId);
	dependencies.logger.log("--- Spotify Track Information ---");
	dependencies.logger.log(`Artist: ${track.artists[0]?.name}`);
	dependencies.logger.log(`Title: ${track.name}`);
	dependencies.logger.log(`Album: ${track.album?.name}`);
	dependencies.logger.log(`Duration: ${formatDuration(track.duration_ms)}`);
	dependencies.logger.log("---------------------------------");

	const artist = track.artists[0]?.name || "unknown";
	const title = track.name;
	const temporaryFileName = dependencies.createReferenceFileName({
		artist,
		title,
	});
	const temporaryOutputPath = dependencies.buildOutputPath(temporaryFileName, dependencies.referencesInboxPath);

	const youtubeSearchService = dependencies.youtubeSearchServiceFactory();
	const searchQuery = `${artist} ${title} audio`;
	const youtubeUrl = await youtubeSearchService.searchFirstVideo(searchQuery);

	const audioDownloaderService = dependencies.audioDownloaderServiceFactory();
	await audioDownloaderService.download(youtubeUrl, temporaryOutputPath);

	const bpmDetectorService = dependencies.bpmDetectorServiceFactory();
	const keyDetectorService = dependencies.keyDetectorServiceFactory();

	let bpm: number | undefined;
	try {
		bpm = await bpmDetectorService.detect(temporaryOutputPath);
		dependencies.logger.log(`Detected BPM: ${bpm}`);
	} catch (error) {
		dependencies.logger.warn(`Unable to detect BPM: ${error instanceof Error ? error.message : String(error)}`);
	}

	let musicalKey: string | undefined;
	try {
		musicalKey = await keyDetectorService.detect(temporaryOutputPath);
		dependencies.logger.log(`Detected Key: ${musicalKey}`);
	} catch (error) {
		dependencies.logger.warn(`Unable to detect key: ${error instanceof Error ? error.message : String(error)}`);
	}

	const fileName = dependencies.createReferenceFileName({
		artist,
		title,
		...(typeof bpm === "number" ? { bpm } : {}),
		...(typeof musicalKey === "string" ? { musicalKey } : {}),
	});
	const outputPath = dependencies.buildOutputPath(fileName, dependencies.referencesInboxPath);

	if (outputPath !== temporaryOutputPath) {
		await dependencies.renameFile(temporaryOutputPath, outputPath);
	}

	dependencies.logger.log(`Reference track downloaded to: ${outputPath}`);
}

export function createDefaultImportReferenceCommandDependencies(referencesInboxPath: string): ImportReferenceCommandDependencies {
	return {
		referencesInboxPath,
		extractTrackId,
		logger: console,
		buildOutputPath,
		createReferenceFileName,
		renameFile,
		spotifyServiceFactory: () => new SpotifyService(),
		youtubeSearchServiceFactory: () => new YouTubeSearchService(),
		audioDownloaderServiceFactory: () => new AudioDownloaderService(),
		bpmDetectorServiceFactory: () => new BpmDetectorService(),
		keyDetectorServiceFactory: () => new KeyDetectorService(),
	};
}
