import logging

from app.subtitle_removal.models import RemovalSettings
from app.subtitle_removal.opencv_inpaint import InpaintingEngine, OpenCvInpaintingEngine

logger = logging.getLogger(__name__)


def create_inpainting_engine(engine_name: str, settings: RemovalSettings) -> InpaintingEngine:
    if engine_name == "opencv-fast":
        return OpenCvInpaintingEngine(settings)
    if engine_name == "ai-inpainting":
        # Chưa cài mô hình AI nên không có engine AI thật. Dùng OpenCV để
        # pipeline không crash giữa chừng; giao diện đã báo "Chưa cài mô hình AI".
        logger.warning("Engine AI inpainting chưa cài mô hình, dùng OpenCV thay thế.")
        return OpenCvInpaintingEngine(settings)
    raise ValueError(f"Engine không được hỗ trợ: {engine_name}")
