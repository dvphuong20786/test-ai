from fastapi import FastAPI
from pathlib import Path
from argostranslate import translate

from app.models.ocr import OcrRequest, OcrResponse
from app.models.pipeline import AutomaticPipelineRequest, AutomaticPipelineResponse, PreviewProxyRequest, SegmentVoiceRequest
from app.services.automatic_pipeline import _tim_ffmpeg, create_preview_proxy, create_video_poster, process_automatic_pipeline, tao_giong_cho_doan
from app.services.job_manager import huy_cong_viec, lay_cac_cong_viec, lay_cong_viec, tao_cong_viec_pipeline
from app.services.ocr_service import detect_subtitles
from app.subtitle_removal.models import RemovalPreviewRequest, RemovalPreviewResponse
from app.subtitle_removal.restoration_pipeline import RestorationPipeline

app = FastAPI(title="VietVoice AI Worker", version="0.3.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ready", "ocr": "paddleocr-v5-mobile"}


@app.get("/api/dependencies")
def dependencies() -> dict:
    missing: list[str] = []
    ffmpeg_path = None
    try:
        ffmpeg_path = _tim_ffmpeg()
    except RuntimeError:
        missing.append("FFmpeg")
    project_root = Path(__file__).resolve().parents[3]
    if not (project_root / "models/piper/vi_VN-vais1000-medium.onnx").is_file():
        missing.append("Model giọng Việt Piper")
    language_codes = {language.code for language in translate.get_installed_languages()}
    if not {"zh", "en", "vi"}.issubset(language_codes):
        missing.append("Gói dịch Argos Trung-Anh-Việt")
    # ffprobe nằm cùng thư mục với ffmpeg và dùng cùng hậu tố hệ điều hành
    # (ffprobe.exe trên Windows, ffprobe trên Linux/macOS).
    ffmpeg_suffix = Path(ffmpeg_path).suffix
    ffprobe_path = str(Path(ffmpeg_path).with_name(f"ffprobe{ffmpeg_suffix}")) if ffmpeg_path else None
    return {"ready": not missing, "missing": missing, "ffprobePath": ffprobe_path}


@app.post("/api/ocr/detect", response_model=OcrResponse)
def run_ocr(request: OcrRequest) -> OcrResponse:
    return detect_subtitles(request)


@app.post("/api/pipeline/automatic", response_model=AutomaticPipelineResponse)
def run_automatic_pipeline(request: AutomaticPipelineRequest) -> AutomaticPipelineResponse:
    return process_automatic_pipeline(request)


@app.post("/api/jobs/automatic")
def create_automatic_job(request: AutomaticPipelineRequest) -> dict:
    return tao_cong_viec_pipeline(request)


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str) -> dict:
    job = lay_cong_viec(job_id)
    if job is None:
        return {"id": job_id, "status": "NOT_FOUND", "error": "Không tìm thấy công việc"}
    return job


@app.get("/api/jobs")
def get_jobs(projectId: str | None = None) -> list[dict]:
    return lay_cac_cong_viec(projectId)


@app.post("/api/jobs/{job_id}/cancel")
def cancel_job(job_id: str) -> dict:
    job = huy_cong_viec(job_id)
    if job is None:
        return {"id": job_id, "status": "NOT_FOUND", "error": "Không tìm thấy công việc"}
    return job


@app.post("/api/subtitle-removal/preview", response_model=RemovalPreviewResponse)
def preview_subtitle_removal(request: RemovalPreviewRequest) -> RemovalPreviewResponse:
    return RestorationPipeline().process_preview(request)


@app.post("/api/media/preview-proxy")
def generate_preview_proxy(request: PreviewProxyRequest) -> dict[str, str]:
    output_path = create_preview_proxy(request.projectId, request.sourcePath)
    return {"outputPath": str(output_path)}


@app.post("/api/tts/segment")
def generate_segment_voice(request: SegmentVoiceRequest) -> dict:
    output_path, duration_ms = tao_giong_cho_doan(request.projectId, request.segmentId, request.text)
    return {"outputPath": str(output_path), "durationMs": duration_ms, "voiceId": "vi_VN-vais1000-medium"}


@app.post("/api/media/poster")
def generate_video_poster(request: PreviewProxyRequest) -> dict[str, str]:
    output_path = create_video_poster(request.projectId, request.sourcePath)
    return {"outputPath": str(output_path)}
