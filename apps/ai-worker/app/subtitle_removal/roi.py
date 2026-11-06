from app.subtitle_removal.models import NormalizedRegion


def normalized_to_pixel_bounds(region: NormalizedRegion, frame_width: int, frame_height: int) -> tuple[int, int, int, int]:
    if frame_width <= 0 or frame_height <= 0:
        raise ValueError("Kích thước frame phải lớn hơn 0")

    left = max(0, min(frame_width - 1, round(region.x * frame_width)))
    top = max(0, min(frame_height - 1, round(region.y * frame_height)))
    right = max(left + 1, min(frame_width, round((region.x + region.width) * frame_width)))
    bottom = max(top + 1, min(frame_height, round((region.y + region.height) * frame_height)))
    return left, top, right, bottom
