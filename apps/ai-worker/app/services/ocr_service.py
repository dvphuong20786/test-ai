import os
from pathlib import Path
from uuid import uuid4
from collections.abc import Callable

import cv2
from paddleocr import PaddleOCR

from app.models.ocr import OcrRequest, OcrResponse, OcrSegment
from app.subtitle.merge import OcrSample, merge_adjacent_samples

os.environ.setdefault("DISABLE_MODEL_SOURCE_CHECK", "True")

_bo_nhan_dang: PaddleOCR | None = None


def _lay_bo_nhan_dang() -> PaddleOCR:
    global _bo_nhan_dang
    if _bo_nhan_dang is None:
        # Tắt MKL-DNN vì PaddlePaddle 3.3 trên Windows lỗi khi chạy model OCR với oneDNN.
        _bo_nhan_dang = PaddleOCR(
            text_detection_model_name="PP-OCRv5_mobile_det",
            text_recognition_model_name="PP-OCRv5_mobile_rec",
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
            enable_mkldnn=False,
        )
    return _bo_nhan_dang


def _doc_chu_trong_anh(anh) -> tuple[str, float]:
    ket_qua = _lay_bo_nhan_dang().predict(anh)
    if not ket_qua:
        return "", 0.0

    du_lieu = ket_qua[0].json.get("res", {})
    cac_dong = [str(dong).strip() for dong in du_lieu.get("rec_texts", []) if str(dong).strip()]
    cac_do_tin_cay = [float(diem) for diem in du_lieu.get("rec_scores", [])]
    if not cac_dong:
        return "", 0.0
    do_tin_cay = sum(cac_do_tin_cay) / len(cac_do_tin_cay) if cac_do_tin_cay else 0.0
    return " ".join(cac_dong), do_tin_cay


def detect_subtitles(request: OcrRequest, bao_cao_tien_do: Callable[[int, int], None] | None = None) -> OcrResponse:
    duong_dan_video = Path(request.sourcePath)
    if not duong_dan_video.is_file():
        raise ValueError(f"Không tìm thấy video nguồn: {duong_dan_video}")

    video = cv2.VideoCapture(str(duong_dan_video))
    if not video.isOpened():
        raise ValueError("PaddleOCR không thể mở video nguồn")

    chieu_rong = int(video.get(cv2.CAP_PROP_FRAME_WIDTH))
    chieu_cao = int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))
    so_khung_hinh = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
    so_khung_moi_giay = max(video.get(cv2.CAP_PROP_FPS), 1.0)
    thoi_luong_ms = round(so_khung_hinh / so_khung_moi_giay * 1000)
    trai = round(request.region.x * chieu_rong)
    tren = round(request.region.y * chieu_cao)
    phai = round((request.region.x + request.region.width) * chieu_rong)
    duoi = round((request.region.y + request.region.height) * chieu_cao)

    cac_mau: list[OcrSample] = []
    buoc_lay_mau_ms = 750
    try:
        cac_thoi_diem = list(range(0, thoi_luong_ms + 1, buoc_lay_mau_ms))
        for vi_tri_mau, thoi_diem_ms in enumerate(cac_thoi_diem, start=1):
            video.set(cv2.CAP_PROP_POS_MSEC, thoi_diem_ms)
            doc_duoc, khung_hinh = video.read()
            if not doc_duoc or khung_hinh is None:
                continue
            anh_vung_phu_de = khung_hinh[tren:duoi, trai:phai]
            noi_dung, do_tin_cay = _doc_chu_trong_anh(anh_vung_phu_de)
            if noi_dung:
                cac_mau.append(OcrSample(thoi_diem_ms, noi_dung, do_tin_cay))
            if bao_cao_tien_do:
                bao_cao_tien_do(vi_tri_mau, len(cac_thoi_diem))
    finally:
        video.release()

    cac_doan_da_gop = merge_adjacent_samples(cac_mau, max_gap_ms=buoc_lay_mau_ms * 2)
    cac_doan = [
        OcrSegment(
            id=str(uuid4()),
            startMs=doan["start_ms"],
            endMs=min(doan["end_ms"], thoi_luong_ms),
            originalText=doan["text"],
            ocrConfidence=doan["confidence"],
            status="DETECTED" if doan["confidence"] >= 0.7 else "NEEDS_REVIEW",
        )
        for doan in cac_doan_da_gop
    ]
    return OcrResponse(segments=cac_doan)
