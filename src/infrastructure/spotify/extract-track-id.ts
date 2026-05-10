export function extractTrackId(spotifyUrl: string): string {
  const match = spotifyUrl.match(
    /track\/([a-zA-Z0-9]+)/
  );

  if (!match?.[1]) {
    throw new Error("Invalid Spotify track URL.");
  }

  return match[1];
}