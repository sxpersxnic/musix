import assert from "node:assert/strict";
import { test } from "node:test";

import { importReferenceTrack, type ImportReferenceCommandDependencies } from "@/application/commands/import-reference.command.js";
import { buildOutputPath } from "@/domain/utils/path.util.js";
import { createReferenceFileName } from "@/infrastructure/file-system/create-reference-file-name.js";

interface CapturedCalls {
	extractTrackId: string[];
	logger: {
		log: string[];
		warn: string[];
	};
	bpmFilePaths: string[];
	keyFilePaths: string[];
	downloads: Array<{ url: string; outputPath: string }>;
	renames: Array<{ from: string; to: string }>;
}

function createDependencies(overrides: Partial<ImportReferenceCommandDependencies> = {}): {
	dependencies: ImportReferenceCommandDependencies;
	calls: CapturedCalls;
} {
	const calls = {
		extractTrackId: [] as string[],
		logger: {
			log: [] as string[],
			warn: [] as string[],
		},
		bpmFilePaths: [] as string[],
		keyFilePaths: [] as string[],
		downloads: [] as Array<{ url: string; outputPath: string }>,
		renames: [] as Array<{ from: string; to: string }>,
	};

	const dependencies: ImportReferenceCommandDependencies = {
		referencesInboxPath: "/tmp/references",
		extractTrackId: (spotifyUrl) => {
			calls.extractTrackId.push(spotifyUrl);
			return "track-123";
		},
		logger: {
			log: (...messages: unknown[]) => {
				calls.logger.log.push(messages.join(" "));
			},
			warn: (...messages: unknown[]) => {
				calls.logger.warn.push(messages.join(" "));
			},
		},
		buildOutputPath,
		createReferenceFileName,
		renameFile: async (from, to) => {
			calls.renames.push({ from, to });
		},
		spotifyServiceFactory: () => ({
			init: async () => undefined,
			getTrack: async (trackId: string) => {
				assert.equal(trackId, "track-123");
				return {
					artists: [{ name: "Pashanim" }],
					name: "Superjung",
					album: { name: "Maybe This Never Happened" },
					duration_ms: 184000,
				};
			},
		}),
		youtubeSearchServiceFactory: () => ({
			searchFirstVideo: async (query: string) => {
				assert.equal(query, "Pashanim Superjung audio");
				return "https://youtube.com/watch?v=test-video";
			},
		}),
		audioDownloaderServiceFactory: () => ({
			download: async (url: string, outputPath: string) => {
				calls.downloads.push({ url, outputPath });
			},
		}),
		bpmDetectorServiceFactory: () => ({
			detect: async (filePath: string) => {
				calls.bpmFilePaths.push(filePath);
				return 170;
			},
		}),
		keyDetectorServiceFactory: () => ({
			detect: async (filePath: string) => {
				calls.keyFilePaths.push(filePath);
				return "Gm";
			},
		}),
		...overrides,
	};

	return { dependencies, calls };
}

test("importReferenceTrack downloads, analyzes, and renames the reference file", async () => {
	const { dependencies, calls } = createDependencies();

	await importReferenceTrack("https://open.spotify.com/track/example", dependencies);

	const temporaryPath = "/tmp/references/unknown_unknown_pashanim_superjung.mp3";
	const finalPath = "/tmp/references/170_gm_pashanim_superjung.mp3";

	assert.deepEqual(calls.logger.log, [
		"Importing reference...\n",
		"--- Spotify Track Information ---",
		"Artist: Pashanim",
		"Title: Superjung",
		"Album: Maybe This Never Happened",
		"Duration: 3:04",
		"---------------------------------",
		"Detected BPM: 170",
		"Detected Key: Gm",
		`Reference track downloaded to: ${finalPath}`,
	]);
	assert.deepEqual(calls.logger.warn, []);
	assert.deepEqual(calls.extractTrackId, ["https://open.spotify.com/track/example"]);
	assert.deepEqual(calls.downloads, [{ url: "https://youtube.com/watch?v=test-video", outputPath: temporaryPath }]);
	assert.deepEqual(calls.bpmFilePaths, [temporaryPath]);
	assert.deepEqual(calls.keyFilePaths, [temporaryPath]);
	assert.deepEqual(calls.renames, [{ from: temporaryPath, to: finalPath }]);
});
