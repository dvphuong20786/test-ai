from typing import Protocol

import cv2
import numpy as np

from app.subtitle_removal.models import RemovalSettings


class InpaintingEngine(Protocol):
    def process_frame(self, frame: np.ndarray, mask: np.ndarray) -> np.ndarray:
        ...


class OpenCvInpaintingEngine:
    def __init__(self, settings: RemovalSettings):
        self.settings = settings

    def process_frame(self, frame: np.ndarray, mask: np.ndarray) -> np.ndarray:
        if frame.shape[:2] != mask.shape[:2]:
            raise ValueError("Frame và mask phải có cùng kích thước")
        method = cv2.INPAINT_TELEA if self.settings.method == "TELEA" else cv2.INPAINT_NS
        restored_frame = cv2.inpaint(frame, mask, self.settings.inpaintRadius, method)
        if self.settings.edgeFeathering == 0:
            return restored_frame

        kernel_size = self.settings.edgeFeathering * 2 + 1
        feathered_mask = cv2.GaussianBlur(mask, (kernel_size, kernel_size), 0).astype(np.float32) / 255.0
        alpha = feathered_mask[:, :, np.newaxis]
        blended_frame = restored_frame.astype(np.float32) * alpha + frame.astype(np.float32) * (1 - alpha)
        return np.clip(blended_frame, 0, 255).astype(np.uint8)
