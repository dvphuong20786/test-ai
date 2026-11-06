/// <reference types="vite/client" />

interface Window {
  vietdubDesktop?: {
    selectVideo(): Promise<string | null>;
    confirmProjectReplacement(): Promise<"SAVE" | "DISCARD" | "CANCEL">;
    getDroppedFilePath(file: File): string;
    showOutputFile(outputPath: string): Promise<void>;
  };
}
