export type SubtitleStatus =
  | "DETECTED"
  | "TRANSLATED"
  | "VOICE_READY"
  | "NEEDS_REVIEW"
  | "APPROVED";

export interface SubtitleSegment {
  id: string;
  projectId: string;
  startMs: number;
  endMs: number;
  originalText: string;
  translatedText: string;
  ocrConfidence?: number;
  status: SubtitleStatus;
  speakerId?: string;
  selectedVoiceId?: string;
  audioAssetId?: string;
  audioDurationMs?: number;
  effectiveStartMs?: number;
  effectiveEndMs?: number;
}

export interface OcrRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type InpaintingMethod = "TELEA" | "NS";

export interface SubtitleRemovalSettings {
  method: InpaintingMethod;
  inpaintRadius: number;
  maskDilation: number;
  edgeFeathering: number;
}

export interface SubtitleRemovalPreview {
  originalImage: string;
  processedImage: string;
  maskImage: string;
  maskCoverage: number;
  suspicious: boolean;
  warnings: string[];
  detectedBoxes: Array<{ x: number; y: number; width: number; height: number }>;
}

export interface MediaMetadata {
  durationMs: number;
  width: number;
  height: number;
  frameRate: number;
  videoCodec: string;
  audioCodec?: string;
}

export interface VideoProject {
  id: string;
  name: string;
  sourcePath: string;
  metadata: MediaMetadata;
  ocrRegion?: OcrRegion;
  sourceAvailable?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AutomaticPipelineResult {
  outputPath: string;
  segments: SubtitleSegment[];
  completedSteps: string[];
}

export type ProcessingStage = "PREPARING" | "PROBE" | "FRAME_EXTRACTION" | "OCR" | "TRANSLATION" | "MASK_GENERATION" | "SUBTITLE_REMOVAL" | "TTS" | "AUDIO_ALIGNMENT" | "SUBTITLE_RENDER" | "EXPORT" | "VALIDATION" | "COMPLETED";
export type ProcessingStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface ProcessingJob {
  id: string;
  projectId: string;
  status: ProcessingStatus;
  stage: ProcessingStage;
  processed: number;
  total: number;
  message: string;
  result?: AutomaticPipelineResult;
  error?: string;
  cancelRequested?: boolean;
  startedAt?: string;
  updatedAt: string;
  completedStages?: ProcessingStage[];
  logs?: string[];
  partialSegments?: SubtitleSegment[];
  partialVersion?: number;
  partialStage?: ProcessingStage;
}
