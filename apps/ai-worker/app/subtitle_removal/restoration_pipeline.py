import base64

import cv2
import numpy as np

from app.subtitle_removal.engine_factory import create_inpainting_engine
from app.subtitle_removal.mask_generator import TextMaskGenerator
from app.subtitle_removal.models import RemovalPreviewRequest, RemovalPreviewResponse
from app.subtitle_removal.quality_metrics import build_quality_warnings, calculate_mask_coverage


def encode_image_data_url(image: np.ndarray, extension: str = ".jpg") -> str:
    encoded, buffer = cv2.imencode(extension, image)
    if not encoded:
        raise RuntimeError("Không thể mã hóa ảnh preview")
    mime_type = "image/png" if extension == ".png" else "image/jpeg"
    return f"data:{mime_type};base64,{base64.b64encode(buffer).decode('ascii')}"


class RestorationPipeline:
    def process_preview(self, request: RemovalPreviewRequest) -> RemovalPreviewResponse:
        video_capture = cv2.VideoCapture(request.sourcePath)
        try:
            if not video_capture.isOpened():
                raise ValueError("Không thể mở video nguồn bằng OpenCV")
            video_capture.set(cv2.CAP_PROP_POS_MSEC, request.timestampMs)
            frame_read, frame = video_capture.read()
            if not frame_read or frame is None:
                raise ValueError("Không đọc được frame tại thời điểm đã chọn")
        finally:
            video_capture.release()

        mask, detected_boxes = TextMaskGenerator().generate(frame, request.regions, request.settings)
        engine = create_inpainting_engine("opencv-fast", request.settings)
        processed_frame = engine.process_frame(frame, mask)
        mask_coverage = calculate_mask_coverage(mask)
        warnings = build_quality_warnings(mask_coverage, len(detected_boxes))

        return RemovalPreviewResponse(
            originalImage=encode_image_data_url(frame),
            processedImage=encode_image_data_url(processed_frame),
            maskImage=encode_image_data_url(mask, ".png"),
            maskCoverage=mask_coverage,
            suspicious=bool(warnings),
            warnings=warnings,
            detectedBoxes=detected_boxes,
        )
