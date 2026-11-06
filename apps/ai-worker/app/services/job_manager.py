from datetime import datetime, timezone
import json
from pathlib import Path
from threading import Lock, Thread
from uuid import uuid4

from app.models.pipeline import AutomaticPipelineRequest
from app.services.automatic_pipeline import process_automatic_pipeline

_khoa_cong_viec = Lock()
_cac_cong_viec: dict[str, dict] = {}
_thu_muc_cong_viec = Path(__file__).resolve().parents[4] / "data/jobs"
_thu_muc_cong_viec.mkdir(parents=True, exist_ok=True)


class CongViecDaHuy(Exception):
    pass


def _thoi_gian_hien_tai() -> str:
    return datetime.now(timezone.utc).isoformat()


def _luu_cong_viec(cong_viec: dict) -> None:
    tep_dich = _thu_muc_cong_viec / f"{cong_viec['id']}.json"
    tep_tam = tep_dich.with_suffix(".tmp")
    tep_tam.write_text(json.dumps(cong_viec, ensure_ascii=False, indent=2), encoding="utf-8")
    tep_tam.replace(tep_dich)


def _tai_cac_cong_viec_cu() -> None:
    for tep_cong_viec in _thu_muc_cong_viec.glob("*.json"):
        try:
            cong_viec = json.loads(tep_cong_viec.read_text(encoding="utf-8"))
            if cong_viec.get("status") in {"QUEUED", "RUNNING"}:
                cong_viec.update({
                    "status": "FAILED", "message": "AI Worker đã khởi động lại khi công việc đang chạy",
                    "error": "Có thể bấm Thử lại để chạy lại công việc", "updatedAt": _thoi_gian_hien_tai(),
                })
                _luu_cong_viec(cong_viec)
            _cac_cong_viec[cong_viec["id"]] = cong_viec
        except (OSError, ValueError, KeyError):
            continue


def tao_cong_viec_pipeline(yeu_cau: AutomaticPipelineRequest) -> dict:
    with _khoa_cong_viec:
        # Một dự án chỉ chạy một pipeline để tránh tranh chấp file tạm và tốn tài nguyên gấp đôi.
        for cong_viec_dang_co in _cac_cong_viec.values():
            if cong_viec_dang_co.get("projectId") == yeu_cau.projectId and cong_viec_dang_co.get("status") in {"QUEUED", "RUNNING"}:
                return cong_viec_dang_co.copy()

        ma_cong_viec = str(uuid4())
        cong_viec = {
            "id": ma_cong_viec,
            "projectId": yeu_cau.projectId,
            "status": "QUEUED",
            "stage": "PREPARING",
            "processed": 0,
            "total": 0,
            "message": "Đang xếp hàng xử lý",
            "result": None,
            "error": None,
            "cancelRequested": False,
            "startedAt": _thoi_gian_hien_tai(),
            "updatedAt": _thoi_gian_hien_tai(),
            "completedStages": [],
            "logs": ["Công việc đã được tạo và đang chờ AI Worker"],
            "partialSegments": [],
            "partialVersion": 0,
        }
        _cac_cong_viec[ma_cong_viec] = cong_viec
        _luu_cong_viec(cong_viec)
    Thread(target=_chay_cong_viec, args=(ma_cong_viec, yeu_cau), daemon=True).start()
    return cong_viec.copy()


def _chay_cong_viec(ma_cong_viec: str, yeu_cau: AutomaticPipelineRequest) -> None:
    def bao_cao(ten_giai_doan: str, da_xu_ly: int, tong_so: int) -> None:
        with _khoa_cong_viec:
            if _cac_cong_viec[ma_cong_viec]["cancelRequested"]:
                raise CongViecDaHuy("Người dùng đã hủy công việc")
            cong_viec = _cac_cong_viec[ma_cong_viec]
            giai_doan_truoc = cong_viec.get("stage")
            if giai_doan_truoc not in {"PREPARING", ten_giai_doan} and giai_doan_truoc not in cong_viec["completedStages"]:
                cong_viec["completedStages"].append(giai_doan_truoc)
            nhat_ky = f"{_thoi_gian_hien_tai()} · {ten_giai_doan} · {da_xu_ly}/{tong_so}"
            if not cong_viec["logs"] or cong_viec["logs"][-1] != nhat_ky:
                cong_viec["logs"] = [*cong_viec["logs"], nhat_ky][-200:]
            cong_viec.update({
                "status": "RUNNING",
                "stage": ten_giai_doan,
                "processed": da_xu_ly,
                "total": tong_so,
                "message": f"{ten_giai_doan}: {da_xu_ly}/{tong_so}",
                "updatedAt": _thoi_gian_hien_tai(),
            })
            _luu_cong_viec(cong_viec)

    def luu_trung_gian(ten_giai_doan: str, cac_doan: list) -> None:
        with _khoa_cong_viec:
            cong_viec = _cac_cong_viec[ma_cong_viec]
            cong_viec["partialSegments"] = [doan.model_dump() for doan in cac_doan]
            cong_viec["partialVersion"] = int(cong_viec.get("partialVersion", 0)) + 1
            cong_viec["partialStage"] = ten_giai_doan
            cong_viec["updatedAt"] = _thoi_gian_hien_tai()
            cong_viec["logs"] = [*cong_viec["logs"], f"Đã lưu {len(cac_doan)} đoạn trung gian sau {ten_giai_doan}"][-200:]
            _luu_cong_viec(cong_viec)

    try:
        with _khoa_cong_viec:
            _cac_cong_viec[ma_cong_viec].update({
                "status": "RUNNING", "message": "Đang nạp mô hình OCR", "updatedAt": _thoi_gian_hien_tai(),
            })
            _luu_cong_viec(_cac_cong_viec[ma_cong_viec])
        ket_qua = process_automatic_pipeline(yeu_cau, bao_cao, luu_trung_gian)
        with _khoa_cong_viec:
            _cac_cong_viec[ma_cong_viec].update({
                "status": "COMPLETED", "stage": "COMPLETED", "processed": 1, "total": 1,
                "message": "Đã xuất video thành công", "result": ket_qua.model_dump(), "updatedAt": _thoi_gian_hien_tai(),
                "completedStages": [*(_cac_cong_viec[ma_cong_viec].get("completedStages") or []), _cac_cong_viec[ma_cong_viec]["stage"]],
            })
            _luu_cong_viec(_cac_cong_viec[ma_cong_viec])
    except CongViecDaHuy as loi:
        with _khoa_cong_viec:
            _cac_cong_viec[ma_cong_viec].update({
                "status": "CANCELLED", "message": str(loi), "error": None, "updatedAt": _thoi_gian_hien_tai(),
            })
            _luu_cong_viec(_cac_cong_viec[ma_cong_viec])
    except Exception as loi:
        with _khoa_cong_viec:
            _cac_cong_viec[ma_cong_viec].update({
                "status": "FAILED", "message": "Pipeline không thể hoàn tất", "error": str(loi), "updatedAt": _thoi_gian_hien_tai(),
            })
            _luu_cong_viec(_cac_cong_viec[ma_cong_viec])


def lay_cong_viec(ma_cong_viec: str) -> dict | None:
    with _khoa_cong_viec:
        cong_viec = _cac_cong_viec.get(ma_cong_viec)
        return cong_viec.copy() if cong_viec else None


def lay_cac_cong_viec(project_id: str | None = None) -> list[dict]:
    with _khoa_cong_viec:
        cac_cong_viec = [cong_viec.copy() for cong_viec in _cac_cong_viec.values() if project_id is None or cong_viec.get("projectId") == project_id]
    return sorted(cac_cong_viec, key=lambda cong_viec: cong_viec.get("updatedAt", ""), reverse=True)


def huy_cong_viec(ma_cong_viec: str) -> dict | None:
    with _khoa_cong_viec:
        cong_viec = _cac_cong_viec.get(ma_cong_viec)
        if not cong_viec:
            return None
        if cong_viec["status"] in {"COMPLETED", "FAILED", "CANCELLED"}:
            return cong_viec.copy()
        cong_viec["cancelRequested"] = True
        cong_viec["message"] = "Đang dừng an toàn sau bước xử lý hiện tại"
        cong_viec["updatedAt"] = _thoi_gian_hien_tai()
        _luu_cong_viec(cong_viec)
        return cong_viec.copy()


_tai_cac_cong_viec_cu()
