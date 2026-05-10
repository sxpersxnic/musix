export function msToSeconds(ms: number): number {
  return ms / 1000;
}

export function secondsToMinutes(seconds: number): number {
  return seconds / 60;
}

export function msToMinutes(ms: number): number {
  const seconds = msToSeconds(ms);
  return secondsToMinutes(seconds);
}