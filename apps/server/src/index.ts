import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { findFfprobePath, probeMedia } from "./media/probe-media.js";

const prisma = new PrismaClient();
const app = express();
const port = Number(process.env.PORT || 43111);
const workerUrl = process.env.AI_WORKER_URL || "http://127.0.0.1:43112";
const cacJobDaLuuKetQua = new Set<string>();
const cacPhienBanTrungGianDaLuu = new Map<string, number>();
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

async function resolveFfprobePath(): Promise<string> {
  const localPath = findFfprobePath();
  if (localPath !== "ffprobe") return localPath;
  const workerResponse = await fetch(`${workerUrl}/api/dependencies`);
  if (!workerResponse.ok) return localPath;
  const workerDependencies = await workerResponse.json() as { ffprobePath?: string };
  return workerDependencies.ffprobePath || localPath;
}

interface JobWorkerResponse {
  id?: string;
  status?: string;
  projectId?: string;
  partialVersion?: number;
  partialSegments?: Array<z.infer<typeof segmentSchema>>;
  result?: { segments?: Array<z.infer<typeof segmentSchema>> };
}

async function persistJobSegments(jobId: string, job: JobWorkerResponse): Promise<void> {
  if (!job.projectId) return;
  const finalSegments = job.status === "COMPLETED" ? job.result?.segments : undefined;
  const partialVersion = job.partialVersion || 0;
  const shouldSaveFinal = Boolean(finalSegments && !cacJobDaLuuKetQua.has(jobId));
  const shouldSavePartial = Boolean(job.partialSegments && partialVersion > (cacPhienBanTrungGianDaLuu.get(jobId) || 0));
  const segmentsToSave = finalSegments || (shouldSavePartial ? job.partialSegments : undefined);
  if (!shouldSaveFinal && !shouldSavePartial || !segmentsToSave) return;
  await prisma.$transaction([
    prisma.segment.deleteMany({ where: { projectId: job.projectId } }),
    ...segmentsToSave.map(segment => prisma.segment.create({ data: { ...segment, projectId: job.projectId! } }))
  ]);
  if (shouldSaveFinal) cacJobDaLuuKetQua.add(jobId);
  if (shouldSavePartial) cacPhienBanTrungGianDaLuu.set(jobId, partialVersion);
}

app.use(cors({ origin: ["http://localhost:5173", "file://"] }));
app.use(express.json({ limit: "2mb" }));

const importSchema = z.object({ sourcePath: z.string().min(1) });
const relinkSchema = z.object({ sourcePath: z.string().min(1) });
const regionSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().positive().max(1),
  height: z.number().positive().max(1)
}).refine(region => region.x + region.width <= 1 && region.y + region.height <= 1, {
  message: "Vùng OCR phải nằm hoàn toàn trong khung hình."
});
const segmentSchema = z.object({
  id: z.string(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
  originalText: z.string(),
  translatedText: z.string(),
  ocrConfidence: z.number().min(0).max(1).optional(),
  status: z.enum(["DETECTED", "TRANSLATED", "VOICE_READY", "NEEDS_REVIEW", "APPROVED"]),
  selectedVoiceId: z.string().optional(),
  audioAssetId: z.string().optional(),
  audioDurationMs: z.number().int().nonnegative().optional()
}).refine(segment => segment.endMs > segment.startMs, { message: "Thời gian kết thúc phải sau thời gian bắt đầu." });
const removalPreviewSchema = z.object({
  timestampMs: z.number().int().nonnegative(),
  regions: z.array(regionSchema).min(1).max(8),
  settings: z.object({
    method: z.enum(["TELEA", "NS"]),
    inpaintRadius: z.number().int().min(1).max(15),
    maskDilation: z.number().int().min(0).max(15),
    edgeFeathering: z.number().int().min(0).max(8)
  })
});
const automaticPipelineResultSchema = z.object({
  outputPath: z.string().min(1),
  segments: z.array(segmentSchema),
  completedSteps: z.array(z.string())
});
const splitSegmentSchema = z.object({ splitMs: z.number().int().positive() });
const mergeSegmentSchema = z.object({ nextSegmentId: z.string().min(1) });
const segmentVoiceSchema = z.object({ text: z.string().trim().min(1) });

function splitTextAtMiddle(text: string): [string, string] {
  if (text.length < 2) return [text, ""];
  const middle = Math.floor(text.length / 2);
  const whitespaceAfterMiddle = text.slice(middle).search(/\s/);
  const splitIndex = whitespaceAfterMiddle >= 0 ? middle + whitespaceAfterMiddle + 1 : middle;
  return [text.slice(0, splitIndex), text.slice(splitIndex)];
}

async function streamMediaFile(request: express.Request, response: express.Response, mediaPath: string): Promise<void> {
  const mediaStat = await stat(mediaPath);
  const rangeHeader = request.headers.range;
  const extension = path.extname(mediaPath).toLowerCase();
  const contentTypeByExtension: Record<string, string> = {
    ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".mkv": "video/x-matroska", ".wav": "audio/wav", ".jpg": "image/jpeg"
  };
  response.setHeader("Accept-Ranges", "bytes");
  response.setHeader("Content-Type", contentTypeByExtension[extension] || "application/octet-stream");
  if (!rangeHeader) {
    response.setHeader("Content-Length", mediaStat.size);
    createReadStream(mediaPath).pipe(response);
    return;
  }
  const rangeMatch = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  if (!rangeMatch) {
    response.status(416).setHeader("Content-Range", `bytes */${mediaStat.size}`).end();
    return;
  }
  const startByte = rangeMatch[1] ? Number(rangeMatch[1]) : 0;
  const requestedEndByte = rangeMatch[2] ? Number(rangeMatch[2]) : mediaStat.size - 1;
  const endByte = Math.min(requestedEndByte, mediaStat.size - 1);
  if (startByte > endByte || startByte >= mediaStat.size) {
    response.status(416).setHeader("Content-Range", `bytes */${mediaStat.size}`).end();
    return;
  }
  response.status(206);
  response.setHeader("Content-Range", `bytes ${startByte}-${endByte}/${mediaStat.size}`);
  response.setHeader("Content-Length", endByte - startByte + 1);
  createReadStream(mediaPath, { start: startByte, end: endByte }).pipe(response);
}

app.get("/health", (_request, response) => response.json({ status: "ready" }));

app.get("/api/dependencies", async (_request, response, next) => {
  try {
    const workerResponse = await fetch(`${workerUrl}/api/dependencies`);
    if (!workerResponse.ok) throw new Error("AI Worker không thể kiểm tra dependency.");
    const workerDependencies = await workerResponse.json() as { ready: boolean; missing: string[]; ffprobePath?: string };
    response.json({ ...workerDependencies, ffprobePath: workerDependencies.ffprobePath || findFfprobePath() });
  } catch (error) {
    next(error);
  }
});

app.get("/api/projects", async (_request, response) => {
  const projects = await prisma.project.findMany({ orderBy: { updatedAt: "desc" } });
  const projectsWithAvailability = await Promise.all(projects.map(async project => {
    try {
      await stat(project.sourcePath);
      return { ...project, sourceAvailable: true };
    } catch {
      return { ...project, sourceAvailable: false };
    }
  }));
  response.json(projectsWithAvailability);
});

app.get("/api/projects/:projectId/media", async (request, response, next) => {
  try {
    const project = await prisma.project.findUniqueOrThrow({ where: { id: request.params.projectId } });
    await streamMediaFile(request, response, project.sourcePath);
  } catch (error) {
    next(error);
  }
});

app.post("/api/projects/:projectId/preview-proxy", async (request, response, next) => {
  try {
    const project = await prisma.project.findUniqueOrThrow({ where: { id: request.params.projectId } });
    const workerResponse = await fetch(`${workerUrl}/api/media/preview-proxy`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: project.id, sourcePath: project.sourcePath })
    });
    if (!workerResponse.ok) throw new Error(`Không thể tạo proxy: ${await workerResponse.text()}`);
    response.json(await workerResponse.json());
  } catch (error) {
    next(error);
  }
});

app.get("/api/projects/:projectId/preview-media", async (request, response, next) => {
  try {
    const previewPath = path.join(workspaceRoot, "data", "previews", `${request.params.projectId}.webm`);
    await streamMediaFile(request, response, previewPath);
  } catch (error) {
    next(error);
  }
});

app.get("/api/projects/:projectId/preview-status", async (request, response) => {
  const previewPath = path.join(workspaceRoot, "data", "previews", `${request.params.projectId}.webm`);
  try {
    const previewStat = await stat(previewPath);
    response.json({ available: previewStat.size > 0 });
  } catch {
    response.json({ available: false });
  }
});

app.post("/api/projects/:projectId/poster", async (request, response, next) => {
  try {
    const project = await prisma.project.findUniqueOrThrow({ where: { id: request.params.projectId } });
    const workerResponse = await fetch(`${workerUrl}/api/media/poster`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: project.id, sourcePath: project.sourcePath })
    });
    if (!workerResponse.ok) throw new Error(`Không thể tạo poster: ${await workerResponse.text()}`);
    response.json(await workerResponse.json());
  } catch (error) {
    next(error);
  }
});

app.get("/api/projects/:projectId/poster", async (request, response, next) => {
  try {
    const posterPath = path.join(workspaceRoot, "data", "posters", `${request.params.projectId}.jpg`);
    await streamMediaFile(request, response, posterPath);
  } catch (error) {
    next(error);
  }
});

app.get("/api/projects/:projectId/segments/:segmentId/audio", async (request, response, next) => {
  try {
    const segment = await prisma.segment.findFirstOrThrow({ where: { id: request.params.segmentId, projectId: request.params.projectId } });
    if (!segment.audioAssetId) throw new Error("Đoạn phụ đề chưa có giọng AI.");
    await streamMediaFile(request, response, segment.audioAssetId);
  } catch (error) {
    next(error);
  }
});

app.post("/api/projects/:projectId/segments/:segmentId/voice", async (request, response, next) => {
  try {
    const { text } = segmentVoiceSchema.parse(request.body);
    const segment = await prisma.segment.findFirstOrThrow({ where: { id: request.params.segmentId, projectId: request.params.projectId } });
    const workerResponse = await fetch(`${workerUrl}/api/tts/segment`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: segment.projectId, segmentId: segment.id, text })
    });
    if (!workerResponse.ok) throw new Error(`Piper không thể tạo giọng: ${await workerResponse.text()}`);
    const voiceResult = z.object({ outputPath: z.string(), durationMs: z.number(), voiceId: z.string() }).parse(await workerResponse.json());
    const savedSegment = await prisma.segment.update({
      where: { id: segment.id },
      data: { audioAssetId: voiceResult.outputPath, audioDurationMs: voiceResult.durationMs, selectedVoiceId: voiceResult.voiceId, status: "VOICE_READY" }
    });
    response.json(savedSegment);
  } catch (error) {
    next(error);
  }
});

app.post("/api/projects/import", async (request, response, next) => {
  try {
    const { sourcePath } = importSchema.parse(request.body);
    const metadata = await probeMedia(sourcePath, await resolveFfprobePath());
    const project = await prisma.project.create({
      data: {
        id: randomUUID(),
        name: path.parse(sourcePath).name,
        sourcePath,
        ...metadata
      }
    });
    response.status(201).json(project);
  } catch (error) {
    next(error);
  }
});

app.patch("/api/projects/:projectId/relink", async (request, response, next) => {
  try {
    const { sourcePath } = relinkSchema.parse(request.body);
    const metadata = await probeMedia(sourcePath, await resolveFfprobePath());
    const project = await prisma.project.update({
      where: { id: request.params.projectId },
      data: { sourcePath, name: path.parse(sourcePath).name, ...metadata }
    });
    response.json({ ...project, sourceAvailable: true });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/projects/:projectId/settings", async (request, response, next) => {
  try {
    const region = regionSchema.parse(request.body.ocrRegion);
    const project = await prisma.project.update({
      where: { id: request.params.projectId }, data: { ocrRegionJson: JSON.stringify(region) }
    });
    response.json(project);
  } catch (error) {
    next(error);
  }
});

app.get("/api/projects/:projectId/segments", async (request, response) => {
  const segments = await prisma.segment.findMany({
    where: { projectId: request.params.projectId },
    orderBy: { startMs: "asc" }
  });
  response.json(segments);
});

app.post("/api/projects/:projectId/ocr", async (request, response, next) => {
  try {
    const region = regionSchema.parse(request.body.region);
    const project = await prisma.project.findUniqueOrThrow({ where: { id: request.params.projectId } });
    await prisma.project.update({
      where: { id: project.id },
      data: { ocrRegionJson: JSON.stringify(region) }
    });

    const workerResponse = await fetch(`${workerUrl}/api/ocr/detect`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: project.id, sourcePath: project.sourcePath, region })
    });
    if (!workerResponse.ok) throw new Error(`AI Worker báo lỗi: ${await workerResponse.text()}`);

    const workerResult = z.object({ segments: z.array(segmentSchema) }).parse(await workerResponse.json());
    await prisma.$transaction([
      prisma.segment.deleteMany({ where: { projectId: project.id } }),
      ...workerResult.segments.map(segment => prisma.segment.create({
        data: { ...segment, projectId: project.id }
      }))
    ]);
    response.json(workerResult);
  } catch (error) {
    next(error);
  }
});

app.post("/api/projects/:projectId/pipeline/automatic", async (request, response, next) => {
  try {
    const region = regionSchema.parse(request.body.region);
    const project = await prisma.project.findUniqueOrThrow({ where: { id: request.params.projectId } });
    const workerResponse = await fetch(`${workerUrl}/api/pipeline/automatic`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: project.id, sourcePath: project.sourcePath, region })
    });
    if (!workerResponse.ok) throw new Error(`Pipeline tự động báo lỗi: ${await workerResponse.text()}`);

    const pipelineResult = automaticPipelineResultSchema.parse(await workerResponse.json());
    await prisma.$transaction([
      prisma.segment.deleteMany({ where: { projectId: project.id } }),
      ...pipelineResult.segments.map(segment => prisma.segment.create({ data: { ...segment, projectId: project.id } }))
    ]);
    response.json({
      ...pipelineResult,
      segments: pipelineResult.segments.map(segment => ({ ...segment, projectId: project.id }))
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/projects/:projectId/jobs/automatic", async (request, response, next) => {
  try {
    const region = regionSchema.parse(request.body.region);
    const project = await prisma.project.findUniqueOrThrow({ where: { id: request.params.projectId } });
    const workerResponse = await fetch(`${workerUrl}/api/jobs/automatic`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: project.id, sourcePath: project.sourcePath, region })
    });
    if (!workerResponse.ok) throw new Error(`Không thể tạo công việc: ${await workerResponse.text()}`);
    response.status(202).json(await workerResponse.json());
  } catch (error) {
    next(error);
  }
});

app.get("/api/projects/:projectId/jobs", async (request, response, next) => {
  try {
    const workerResponse = await fetch(`${workerUrl}/api/jobs?projectId=${encodeURIComponent(request.params.projectId)}`);
    if (!workerResponse.ok) throw new Error(`Không thể đọc lịch sử công việc: ${await workerResponse.text()}`);
    response.json(await workerResponse.json());
  } catch (error) {
    next(error);
  }
});

app.get("/api/jobs/:jobId", async (request, response, next) => {
  try {
    const workerResponse = await fetch(`${workerUrl}/api/jobs/${request.params.jobId}`);
    if (!workerResponse.ok) throw new Error(`Không thể đọc tiến độ: ${await workerResponse.text()}`);
    const job = await workerResponse.json() as JobWorkerResponse;
    await persistJobSegments(request.params.jobId, job);
    response.json(job);
  } catch (error) {
    next(error);
  }
});

app.get("/api/jobs/:jobId/events", (request, response) => {
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache");
  response.setHeader("Connection", "keep-alive");
  response.flushHeaders();

  let daDong = false;
  const guiTienDo = async () => {
    if (daDong) return;
    try {
      const workerResponse = await fetch(`${workerUrl}/api/jobs/${request.params.jobId}`);
      const job = await workerResponse.json() as JobWorkerResponse;
      await persistJobSegments(request.params.jobId, job);
      response.write(`data: ${JSON.stringify(job)}\n\n`);
      if (["COMPLETED", "FAILED", "CANCELLED", "NOT_FOUND"].includes(job.status || "")) {
        clearInterval(boHenGuiTienDo);
        response.end();
      }
    } catch (error) {
      response.write(`event: job-error\ndata: ${JSON.stringify({ message: error instanceof Error ? error.message : "Mất kết nối AI Worker" })}\n\n`);
    }
  };
  const boHenGuiTienDo = setInterval(() => void guiTienDo(), 700);
  void guiTienDo();
  request.on("close", () => {
    daDong = true;
    clearInterval(boHenGuiTienDo);
  });
});

app.post("/api/jobs/:jobId/cancel", async (request, response, next) => {
  try {
    const workerResponse = await fetch(`${workerUrl}/api/jobs/${request.params.jobId}/cancel`, { method: "POST" });
    response.status(workerResponse.status).json(await workerResponse.json());
  } catch (error) {
    next(error);
  }
});

app.put("/api/projects/:projectId/segments/:segmentId", async (request, response, next) => {
  try {
    const segment = segmentSchema.parse({ ...request.body, id: request.params.segmentId });
    const savedSegment = await prisma.segment.update({
      where: { id: segment.id },
      data: {
        startMs: segment.startMs,
        endMs: segment.endMs,
        originalText: segment.originalText,
        translatedText: segment.translatedText,
        ocrConfidence: segment.ocrConfidence,
        status: segment.status,
        selectedVoiceId: segment.selectedVoiceId,
        audioAssetId: segment.audioAssetId,
        audioDurationMs: segment.audioDurationMs
      }
    });
    response.json(savedSegment);
  } catch (error) {
    next(error);
  }
});

app.post("/api/projects/:projectId/segments/:segmentId/split", async (request, response, next) => {
  try {
    const { splitMs } = splitSegmentSchema.parse(request.body);
    const segment = await prisma.segment.findFirstOrThrow({ where: { id: request.params.segmentId, projectId: request.params.projectId } });
    if (splitMs <= segment.startMs || splitMs >= segment.endMs) throw new Error("Điểm tách phải nằm bên trong đoạn phụ đề.");
    const newSegmentId = randomUUID();
    const [originalTextBefore, originalTextAfter] = splitTextAtMiddle(segment.originalText);
    const [translatedTextBefore, translatedTextAfter] = splitTextAtMiddle(segment.translatedText);
    await prisma.$transaction([
      prisma.segment.update({ where: { id: segment.id }, data: { endMs: splitMs, originalText: originalTextBefore, translatedText: translatedTextBefore } }),
      prisma.segment.create({ data: { ...segment, id: newSegmentId, startMs: splitMs, originalText: originalTextAfter, translatedText: translatedTextAfter, createdAt: undefined, updatedAt: undefined } })
    ]);
    const segments = await prisma.segment.findMany({ where: { projectId: request.params.projectId }, orderBy: { startMs: "asc" } });
    response.json({ segments });
  } catch (error) {
    next(error);
  }
});

app.post("/api/projects/:projectId/segments/:segmentId/merge", async (request, response, next) => {
  try {
    const { nextSegmentId } = mergeSegmentSchema.parse(request.body);
    const [currentSegment, nextSegment] = await Promise.all([
      prisma.segment.findFirstOrThrow({ where: { id: request.params.segmentId, projectId: request.params.projectId } }),
      prisma.segment.findFirstOrThrow({ where: { id: nextSegmentId, projectId: request.params.projectId } })
    ]);
    await prisma.$transaction([
      prisma.segment.update({ where: { id: currentSegment.id }, data: {
        endMs: Math.max(currentSegment.endMs, nextSegment.endMs),
        originalText: `${currentSegment.originalText}${nextSegment.originalText}`.trim(),
        translatedText: `${currentSegment.translatedText}${nextSegment.translatedText}`.trim(),
        status: "NEEDS_REVIEW"
      } }),
      prisma.segment.delete({ where: { id: nextSegment.id } })
    ]);
    const segments = await prisma.segment.findMany({ where: { projectId: request.params.projectId }, orderBy: { startMs: "asc" } });
    response.json({ segments });
  } catch (error) {
    next(error);
  }
});

app.post("/api/projects/:projectId/subtitle-removal/preview", async (request, response, next) => {
  try {
    const previewRequest = removalPreviewSchema.parse(request.body);
    const project = await prisma.project.findUniqueOrThrow({ where: { id: request.params.projectId } });

    await prisma.project.update({
      where: { id: project.id },
      data: { ocrRegionJson: JSON.stringify(previewRequest.regions) }
    });

    const workerResponse = await fetch(`${workerUrl}/api/subtitle-removal/preview`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sourcePath: project.sourcePath, ...previewRequest })
    });
    if (!workerResponse.ok) {
      throw new Error(`AI Worker không thể tạo preview xóa phụ đề: ${await workerResponse.text()}`);
    }
    response.json(await workerResponse.json());
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const technicalMessage = error instanceof Error ? error.message : "Lỗi không xác định.";
  const errorCode = typeof error === "object" && error && "code" in error ? String(error.code) : "INTERNAL_ERROR";
  let message = technicalMessage;
  if (errorCode === "ENOENT") message = "Không tìm thấy file nguồn hoặc file trung gian. Hãy liên kết lại video và thử lại.";
  if (errorCode === "ENOSPC") message = "Ổ đĩa không còn đủ dung lượng để xử lý video. Hãy giải phóng dung lượng rồi thử lại.";
  if (/fetch failed|ECONNREFUSED/i.test(technicalMessage)) message = "AI Worker không phản hồi. Hãy kiểm tra terminal Python tại cổng 43112 rồi thử lại.";
  if (/Paddle|OCR/i.test(technicalMessage) && /init|khởi tạo|initialize/i.test(technicalMessage)) message = "PaddleOCR không khởi tạo được. Hãy kiểm tra model OCR và nhật ký AI Worker.";
  response.status(error instanceof z.ZodError ? 400 : errorCode === "ENOENT" ? 404 : 500).json({
    message,
    details: {
      operation: `${request.method} ${request.path}`,
      timestamp: new Date().toISOString(),
      code: errorCode,
      technicalMessage
    }
  });
});

app.listen(port, "127.0.0.1", () => {
  console.log(JSON.stringify({ level: "info", message: "VietDub Server đã sẵn sàng", port }));
});
