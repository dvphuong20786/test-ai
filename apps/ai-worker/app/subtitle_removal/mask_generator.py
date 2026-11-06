import cv2
import numpy as np

from app.subtitle_removal.models import DetectedBox, NormalizedRegion, RemovalSettings
from app.subtitle_removal.roi import normalized_to_pixel_bounds
from app.subtitle_removal.text_detection import find_text_components


class TextMaskGenerator:
    def generate(
        self,
        frame: np.ndarray,
        regions: list[NormalizedRegion],
        settings: RemovalSettings,
    ) -> tuple[np.ndarray, list[DetectedBox]]:
        frame_height, frame_width = frame.shape[:2]
        final_mask = np.zeros((frame_height, frame_width), dtype=np.uint8)
        detected_boxes: list[DetectedBox] = []

        for region in regions:
            left, top, right, bottom = normalized_to_pixel_bounds(region, frame_width, frame_height)
            region_image = frame[top:bottom, left:right]
            gray_image = cv2.cvtColor(region_image, cv2.COLOR_BGR2GRAY)

            # Phụ đề thường có nét sáng và viền tối. Kết hợp ngưỡng sáng với gradient
            # để lấy nét chữ, thay vì xóa toàn bộ hình chữ nhật người dùng chọn.
            _, bright_pixels = cv2.threshold(gray_image, 185, 255, cv2.THRESH_BINARY)
            gradient = cv2.morphologyEx(gray_image, cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8))
            _, strong_edges = cv2.threshold(gradient, 35, 255, cv2.THRESH_BINARY)
            candidate_mask = cv2.bitwise_and(bright_pixels, cv2.dilate(strong_edges, np.ones((3, 3), np.uint8)))

            # Chữ phụ đề tạo thành hàng ngang có nhiều nét sáng trải rộng. Chi tiết áo,
            # cà vạt hoặc khuôn mặt thường chỉ sáng trong một vùng hẹp nên không được
            # phép đi tiếp vào mặt nạ, kể cả khi màu của chúng giống màu chữ.
            bright_pixel_count_by_row = np.count_nonzero(candidate_mask, axis=1)
            minimum_text_row_pixels = max(40, round(candidate_mask.shape[1] * 0.05))
            probable_text_rows = (bright_pixel_count_by_row >= minimum_text_row_pixels).astype(np.uint8) * 255
            probable_text_rows = cv2.dilate(
                probable_text_rows.reshape(-1, 1),
                np.ones((7, 1), np.uint8),
            )
            horizontal_text_mask = np.repeat(probable_text_rows, candidate_mask.shape[1], axis=1)
            candidate_mask = cv2.bitwise_and(candidate_mask, horizontal_text_mask)

            probable_boxes = find_text_components(candidate_mask, left, top)
            detected_boxes.extend(probable_boxes)
            probable_text_mask = np.zeros_like(candidate_mask)
            for box in probable_boxes:
                local_x = box.x - left
                local_y = box.y - top
                probable_text_mask[local_y:local_y + box.height, local_x:local_x + box.width] = candidate_mask[local_y:local_y + box.height, local_x:local_x + box.width]
            candidate_mask = probable_text_mask
            if settings.maskDilation > 0:
                kernel_size = settings.maskDilation * 2 + 1
                candidate_mask = cv2.dilate(candidate_mask, np.ones((kernel_size, kernel_size), np.uint8))

            final_mask[top:bottom, left:right] = cv2.bitwise_or(
                final_mask[top:bottom, left:right], candidate_mask
            )

        return final_mask, detected_boxes
