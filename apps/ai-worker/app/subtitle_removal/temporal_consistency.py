import numpy as np


def mask_intersection_over_union(previous_mask: np.ndarray, current_mask: np.ndarray) -> float:
    if previous_mask.shape != current_mask.shape:
        raise ValueError("Hai mask phải có cùng kích thước")
    previous_pixels = previous_mask > 0
    current_pixels = current_mask > 0
    union = np.logical_or(previous_pixels, current_pixels).sum()
    if union == 0:
        return 1.0
    intersection = np.logical_and(previous_pixels, current_pixels).sum()
    return float(intersection / union)


def is_suspicious_mask_change(previous_mask: np.ndarray, current_mask: np.ndarray, minimum_iou: float = 0.2) -> bool:
    return mask_intersection_over_union(previous_mask, current_mask) < minimum_iou
