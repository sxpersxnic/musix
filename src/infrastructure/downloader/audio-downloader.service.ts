import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class AudioDownloaderService {
	public async download(url: string, outputPath: string): Promise<void> {
		await execFileAsync("yt-dlp", [
			"-x",
			"--audio-format",
			"mp3",
			"-o",
			outputPath,
			url,
		]);
	}
}