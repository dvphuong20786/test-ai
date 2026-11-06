from app.subtitle_removal.models import RemovalSettings
from app.subtitle_removal.opencv_inpaint import InpaintingEngine, OpenCvInpaintingEngine


def create_inpainting_engine(engine_name: str, settings: RemovalSettings) -> InpaintingEngine:
    if engine_name == "opencv-fast":
        return OpenCvInpaintingEngine(settings)
    if engine_name == "ai-inpainting":
        raise RuntimeError("Chưa cài mô hình AI")
    raise ValueError(f"Engine không được hỗ trợ: {engine_name}")
