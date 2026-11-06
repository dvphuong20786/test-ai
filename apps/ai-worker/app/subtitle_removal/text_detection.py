import cv2
import numpy as np

from app.subtitle_removal.models import DetectedBox


def find_text_components(binary_mask: np.ndarray, offset_x: int, offset_y: int) -> list[DetectedBox]:
    component_count, _, stats, _ = cv2.connectedComponentsWithStats(binary_mask, connectivity=8)
    boxes: list[DetectedBox] = []
    mask_height, mask_width = binary_mask.shape[:2]

    for component_index in range(1, component_count):
        x, y, width, height, area = stats[component_index]
        is_probable_text = (
            area >= 6
            and height >= max(3, round(mask_height * 0.05))
            and height <= round(mask_height * 0.45)
            and width <= round(mask_width * 0.75)
        )
        if not is_probable_text:
            continue
        boxes.append(DetectedBox(x=offset_x + int(x), y=offset_y + int(y), width=int(width), height=int(height)))

    return boxes
