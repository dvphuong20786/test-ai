import type {
  AutomaticPipelineResult,
  OcrRegion,
  SubtitleRemovalPreview,
  SubtitleRemovalSettings,
  SubtitleSegment,
  VideoProject
} from "@vietdub/shared";
import type { ProcessingJob } from "@vietdub/shared";

const apiUrl = "http://127.0.0.1:43111";

function taoLoiKetNoi(loi: unknown): Error {
  const chiTiet = loi instanceof Error ? loi.message : String(loi);
  return new Error(`Không kết nối được VietDub Server tại ${apiUrl}. Hãy kiểm tra cửa sổ terminal chạy server. Chi tiết: ${chiTiet}`);
}

async function guiYeuCau(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (loi) {
    throw taoLoiKetNoi(loi);
  }
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: "Không đọc được phản hồi máy chủ.", details: undefined }));
    const chiTiet = errorBody.details && typeof errorBody.details === "object"
      ? ` [${String(errorBody.details.code || response.status)} · ${String(errorBody.details.operation || "API")} · ${String(errorBody.details.timestamp || "")}]`
      : "";
    throw new Error(`${errorBody.message || "Máy chủ xử lý thất bại."}${chiTiet}`);
  }
  return response.json() as Promise<T>;
}

function mapVideoProject(project: Record<string, unknown>): VideoProject {
  let ocrRegion: OcrRegion | undefined;
  if (typeof project.ocrRegionJson === "string" && project.ocrRegionJson) {
    try {
      const savedRegion = JSON.parse(project.ocrRegionJson) as OcrRegion | OcrRegion[];
      ocrRegion = Array.isArray(savedRegion) ? savedRegion[0] : savedRegion;
    } catch {
      ocrRegion = undefined;
    }
  }
  return {
    id: String(project.id),
    name: String(project.name),
    sourcePath: String(project.sourcePath),
    metadata: {
      durationMs: Number(project.durationMs),
      width: Number(project.width),
      height: Number(project.height),
      frameRate: Number(project.frameRate),
      videoCodec: String(project.videoCodec),
      audioCodec: project.audioCodec ? String(project.audioCodec) : undefined
    },
    ocrRegion,
    sourceAvailable: project.sourceAvailable === undefined ? true : Boolean(project.sourceAvailable),
    createdAt: String(project.createdAt),
    updatedAt: String(project.updatedAt)
  };
}

export async function listProjects(): Promise<VideoProject[]> {
  const response = await guiYeuCau(`${apiUrl}/api/projects`);
  const projects = await readJson<Array<Record<string, unknown>>>(response);
  return projects.map(mapVideoProject);
}

export async function checkDependencies(): Promise<{ ready: boolean; missing: string[] }> {
  const response = await guiYeuCau(`${apiUrl}/api/dependencies`);
  return readJson<{ ready: boolean; missing: string[] }>(response);
}

export async function getProjectSegments(projectId: string): Promise<SubtitleSegment[]> {
  const response = await guiYeuCau(`${apiUrl}/api/projects/${projectId}/segments`);
  const segments = await readJson<SubtitleSegment[]>(response);
  return segments.map(segment => ({ ...segment, projectId }));
}

export async function generatePreviewProxy(projectId: string): Promise<void> {
  const response = await guiYeuCau(`${apiUrl}/api/projects/${projectId}/preview-proxy`, { method: "POST" });
  await readJson(response);
}

export async function hasPreviewProxy(projectId: string): Promise<boolean> {
  const response = await guiYeuCau(`${apiUrl}/api/projects/${projectId}/preview-status`);
  const result = await readJson<{ available: boolean }>(response);
  return result.available;
}

export async function generateVideoPoster(projectId: string): Promise<string> {
  const response = await guiYeuCau(`${apiUrl}/api/projects/${projectId}/poster`, { method: "POST" });
  await readJson(response);
  return `${apiUrl}/api/projects/${projectId}/poster?version=${Date.now()}`;
}

export async function importVideo(sourcePath: string): Promise<VideoProject> {
  const response = await guiYeuCau(`${apiUrl}/api/projects/import`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sourcePath })
  });
  const project = await readJson<Record<string, unknown>>(response);
  return mapVideoProject(project);
}

export async function relinkProjectSource(projectId: string, sourcePath: string): Promise<VideoProject> {
  const response = await guiYeuCau(`${apiUrl}/api/projects/${projectId}/relink`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sourcePath })
  });
  return mapVideoProject(await readJson<Record<string, unknown>>(response));
}

export async function saveProjectSettings(projectId: string, ocrRegion: OcrRegion): Promise<void> {
  const response = await guiYeuCau(`${apiUrl}/api/projects/${projectId}/settings`, {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ ocrRegion })
  });
  await readJson(response);
}

export async function runOcr(projectId: string, region: OcrRegion): Promise<SubtitleSegment[]> {
  const response = await guiYeuCau(`${apiUrl}/api/projects/${projectId}/ocr`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ region })
  });
  const result = await readJson<{ segments: SubtitleSegment[] }>(response);
  return result.segments.map(segment => ({ ...segment, projectId }));
}

export async function runAutomaticPipeline(projectId: string, region: OcrRegion): Promise<AutomaticPipelineResult> {
  const response = await guiYeuCau(`${apiUrl}/api/projects/${projectId}/pipeline/automatic`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ region })
  });
  return readJson<AutomaticPipelineResult>(response);
}

export async function createAutomaticJob(projectId: string, region: OcrRegion): Promise<ProcessingJob> {
  const response = await guiYeuCau(`${apiUrl}/api/projects/${projectId}/jobs/automatic`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ region })
  });
  return readJson<ProcessingJob>(response);
}

export async function getProcessingJob(jobId: string): Promise<ProcessingJob> {
  const response = await guiYeuCau(`${apiUrl}/api/jobs/${jobId}`);
  return readJson<ProcessingJob>(response);
}

export async function listProjectJobs(projectId: string): Promise<ProcessingJob[]> {
  const response = await guiYeuCau(`${apiUrl}/api/projects/${projectId}/jobs`);
  return readJson<ProcessingJob[]>(response);
}

export function observeProcessingJob(jobId: string, khiCoTienDo: (job: ProcessingJob) => void): Promise<ProcessingJob> {
  return new Promise((resolve, reject) => {
    const eventSource = new EventSource(`${apiUrl}/api/jobs/${jobId}/events`);
    eventSource.onmessage = event => {
      const job = JSON.parse(event.data) as ProcessingJob;
      khiCoTienDo(job);
      if (["COMPLETED", "FAILED", "CANCELLED"].includes(job.status)) {
        eventSource.close();
        resolve(job);
      }
    };
    eventSource.addEventListener("job-error", event => {
      eventSource.close();
      const data = JSON.parse((event as MessageEvent).data) as { message?: string };
      reject(new Error(data.message || "Mất kết nối khi theo dõi tiến độ."));
    });
  });
}

export async function cancelProcessingJob(jobId: string): Promise<ProcessingJob> {
  const response = await guiYeuCau(`${apiUrl}/api/jobs/${jobId}/cancel`, { method: "POST" });
  return readJson<ProcessingJob>(response);
}

export async function saveSegment(segment: SubtitleSegment): Promise<void> {
  const response = await guiYeuCau(`${apiUrl}/api/projects/${segment.projectId}/segments/${segment.id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(segment)
  });
  await readJson(response);
}

export async function generateSegmentVoice(segment: SubtitleSegment): Promise<SubtitleSegment> {
  const response = await guiYeuCau(`${apiUrl}/api/projects/${segment.projectId}/segments/${segment.id}/voice`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: segment.translatedText })
  });
  return { ...await readJson<SubtitleSegment>(response), projectId: segment.projectId };
}

export function getSegmentVoiceUrl(segment: SubtitleSegment): string {
  return `${apiUrl}/api/projects/${segment.projectId}/segments/${segment.id}/audio?version=${encodeURIComponent(segment.audioAssetId || "new")}`;
}

export async function splitSubtitleSegment(segment: SubtitleSegment, splitMs: number): Promise<SubtitleSegment[]> {
  const response = await guiYeuCau(`${apiUrl}/api/projects/${segment.projectId}/segments/${segment.id}/split`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ splitMs })
  });
  const result = await readJson<{ segments: SubtitleSegment[] }>(response);
  return result.segments.map(savedSegment => ({ ...savedSegment, projectId: segment.projectId }));
}

export async function mergeSubtitleSegments(currentSegment: SubtitleSegment, nextSegment: SubtitleSegment): Promise<SubtitleSegment[]> {
  const response = await guiYeuCau(`${apiUrl}/api/projects/${currentSegment.projectId}/segments/${currentSegment.id}/merge`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nextSegmentId: nextSegment.id })
  });
  const result = await readJson<{ segments: SubtitleSegment[] }>(response);
  return result.segments.map(savedSegment => ({ ...savedSegment, projectId: currentSegment.projectId }));
}

export async function previewSubtitleRemoval(
  projectId: string,
  timestampMs: number,
  regions: OcrRegion[],
  settings: SubtitleRemovalSettings
): Promise<SubtitleRemovalPreview> {
  const response = await guiYeuCau(`${apiUrl}/api/projects/${projectId}/subtitle-removal/preview`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ timestampMs, regions, settings })
  });
  return readJson<SubtitleRemovalPreview>(response);
}
