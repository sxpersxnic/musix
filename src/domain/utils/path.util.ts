import path from "node:path";

export function buildOutputPath(fileName: string, outDir: string): string {
  return path.join(outDir, fileName);
}