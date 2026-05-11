export function validateEnvironment(): void {
  if (!process.env.SPOTIFY_CLIENT_ID) {
    throw new Error('SPOTIFY_CLIENT_ID environment variable is not set');
  }

  if (!process.env.SPOTIFY_CLIENT_SECRET) {
    throw new Error('SPOTIFY_CLIENT_SECRET environment variable is not set');
  }
}