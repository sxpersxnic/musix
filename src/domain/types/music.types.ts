export type Scale = "major" | "minor";

export type Mode = "ionian" | "dorian" | "phrygian" | "lydian" | "mixolydian" | "aeolian" | "locrian";

export type Note = "C" | "C#" | "D" | "D#" | "E" | "F" | "F#" | "G" | "G#" | "A" | "A#" | "B";

export type MajorKey = "C" | "C#" | "D" | "D#" | "E" | "F" | "F#" | "G" | "G#" | "A" | "A#" | "B";
export type MinorKey = `${Note}m`;
export type ClassicalKey = MajorKey | MinorKey;
export type CamelotKey = "1A" | "2A" | "3A" | "4A" | "5A" | "6A" | "7A" | "8A" | "9A" | "10A" | "11A" | "12A" | "1B" | "2B" | "3B" | "4B" | "5B" | "6B" | "7B" | "8B" | "9B" | "10B" | "11B" | "12B";
export type MusicalKey = ClassicalKey | CamelotKey;

export interface KeySignature {
  root: Note;
  scale: Scale;
  mode: Mode;
  classicalKey: ClassicalKey;
  camelotKey: CamelotKey;
}