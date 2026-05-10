import SearchYoutube from "youtube-search-api";

export class YouTubeSearchService {
	public async searchFirstVideo(query: string): Promise<string> {
		const result = await SearchYoutube.GetListByKeyword(query, false, 1);

		const video = result.items[0];

		if (!video?.id) {
			throw new Error("No YouTube video found.");
		}

		return `https://youtube.com/watch?v=${video.id}`;
	}
}