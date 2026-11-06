import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { MediaMetadata } from "@vietvoice/shared";

interface ProbeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
}

interface ProbeOutput {
  format?: { duration?: string };
  streams?: ProbeStream[];
}

export function parseFrameRate(frameRate = "0/1"): number {
  const [numerator, denominator] = frameRate.split("/").map(Number);
  if (!numerator || !denominator) return 0;
  return numerator / denominator;
}

export function findFfprobePath(): string {
  if (process.env.FFPROBE_PATH) return process.env.FFPROBE_PATH;
  const localAppData = process.env.LOCALAPPDATA || path.join(homedir(), "AppData", "Local");
  const packagesDirectory = path.join(localAppData, "Microsoft", "WinGet", "Packages");
  try {
    const ffmpegPackageNames = readdirSync(packagesDirectory).filter(name => name.startsWith("Gyan.FFmpeg_"));
    for (const packageName of ffmpegPackageNames) {
      const packageDirectory = path.join(packagesDirectory, packageName);
      const versionDirectories = readdirSync(packageDirectory).filter(name => name.startsWith("ffmpeg-"));
      for (const versionDirectory of versionDirectories) {
        const candidate = path.join(packageDirectory, versionDirectory, "bin", "ffprobe.exe");
        if (existsSync(candidate)) return candidate;
      }
    }
  } catch {
    // Nếu WinGet không tồn tại, spawn theo PATH bên dưới sẽ trả lỗi có hướng dẫn rõ ràng.
  }
  return "ffprobe";
}

export async function probeMedia(sourcePath: string, configuredFfprobePath?: string): Promise<MediaMetadata> {
  const ffprobePath = configuredFfprobePath || findFfprobePath();
  const args = ["-v", "error", "-show_streams", "-show_format", "-of", "json", sourcePath];

  const output = await new Promise<string>((resolve, reject) => {
    const processHandle = spawn(ffprobePath, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";

    processHandle.stdout.on("data", chunk => { stdout += chunk.toString(); });
    processHandle.stderr.on("data", chunk => { stderr += chunk.toString(); });
    processHandle.on("error", reject);
    processHandle.on("close", exitCode => {
      if (exitCode !== 0) {
        reject(new Error(`FFprobe không thể đọc video: ${stderr.trim()}`));
        return;
      }
      resolve(stdout);
    });
  });

  const probeOutput = JSON.parse(output) as ProbeOutput;
  const videoStream = probeOutput.streams?.find(stream => stream.codec_type === "video");
  const audioStream = probeOutput.streams?.find(stream => stream.codec_type === "audio");
  if (!videoStream) throw new Error("Tệp đã chọn không có luồng video hợp lệ.");

  return {
    durationMs: Math.round(Number(probeOutput.format?.duration || 0) * 1000),
    width: videoStream.width || 0,
    height: videoStream.height || 0,
    frameRate: parseFrameRate(videoStream.avg_frame_rate),
    videoCodec: videoStream.codec_name || "unknown",
    audioCodec: audioStream?.codec_name
  };
}
