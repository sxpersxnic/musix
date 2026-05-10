import SpotifyWebApi from "spotify-web-api-node";
import { config } from "dotenv";

config();

export class SpotifyService {
  private readonly api: SpotifyWebApi;

  public constructor() {
    this.api = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    });
  }

  public async init(): Promise<void> {
    const credentials = await this.api.clientCredentialsGrant();

    this.api.setAccessToken(
      credentials.body.access_token
    );
  }

  public async getTrack(trackId: string): Promise<SpotifyApi.SingleTrackResponse> {
    const result = await this.api.getTrack(trackId);
    return result.body;
  }
}