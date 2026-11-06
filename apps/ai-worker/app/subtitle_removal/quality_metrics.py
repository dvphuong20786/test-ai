import numpy as np


def calculate_mask_coverage(mask: np.ndarray) -> float:
    if mask.size == 0:
        return 0.0
    return float(np.count_nonzero(mask) / mask.size)


def build_quality_warnings(mask_coverage: float, detected_box_count: int) -> list[str]:
    warnings: list[str] = []
    if detected_box_count == 0:
        warnings.append("Không phát hiện được nét chữ trong vùng đã chọn.")
    if mask_coverage > 0.12:
        warnings.append("Mask đang che phủ diện tích lớn; hãy kiểm tra để tránh xóa nhầm nền hoặc logo.")
    return warnings
