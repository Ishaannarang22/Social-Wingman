export interface TranscriptWord {
  word: string;
  start: number; // Timestamp in seconds
  end: number;
  confidence: number;
  isFiller: boolean;
}

export interface TranscriptSegment {
  id: string;
  speaker: "user" | "partner";
  text: string;
  words: TranscriptWord[];
  startTime: number;
  endTime: number;
  confidence: number;
  isValid: boolean; // Meets minimum duration and confidence
  fillerCount: number;
}

export interface TranscriptBuffer {
  segments: TranscriptSegment[];
  windowDuration: number; // Usually 60 seconds
  currentTime: number;
}

export interface SpeechState {
  isSpeaking: boolean;
  speakingStartTime: number | null;
  lastSpeechEndTime: number;
  silenceDuration: number;
  currentSegmentDuration: number;
}

export const FILLER_WORDS = [
  "um",
  "uh",
  "uhh",
  "umm",
  "ah",
  "ahh",
  "er",
  "err",
  "like",
  "you know",
  "i mean",
  "basically",
  "actually",
  "literally",
  "so",
  "right",
  "yeah",
  "okay",
];

export const MIN_SPEECH_DURATION_MS = 350;
export const MIN_CONFIDENCE_THRESHOLD = 0.6;
export const TRANSCRIPT_WINDOW_SECONDS = 60;
