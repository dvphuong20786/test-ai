import shutil
import subprocess
import tempfile
import wave
from collections.abc import Callable
from pathlib import Path

import cv2
from argostranslate import translate
from piper import PiperVoice

from app.models.ocr import OcrRequest, OcrSegment
from app.models.pipeline import AutomaticPipelineRequest, AutomaticPipelineResponse
from app.services.ocr_service import detect_subtitles
from app.subtitle_removal.engine_factory import create_inpainting_engine
from app.subtitle_removal.mask_generator import TextMaskGenerator
from app.subtitle_removal.models import NormalizedRegion, RemovalSettings

_giong_viet: PiperVoice | None = None


def _tim_ffmpeg() -> str:
    duong_dan = shutil.which("ffmpeg")
    if duong_dan:
        return duong_dan
    thu_muc_cuc_bo = Path.home() / "AppData/Local/Microsoft/WinGet/Packages"
    cac_tep = list(thu_muc_cuc_bo.glob("Gyan.FFmpeg_*/ffmpeg-*/bin/ffmpeg.exe"))
    if cac_tep:
        return str(cac_tep[0])
    raise RuntimeError("Không tìm thấy FFmpeg. Hãy mở Terminal mới sau khi cài FFmpeg.")


def _dich_sang_tieng_viet(noi_dung_trung: str) -> str:
    noi_dung_anh = translate.translate(noi_dung_trung, "zh", "en")
    return translate.translate(noi_dung_anh, "en", "vi")


def _lay_giong_viet() -> PiperVoice:
    global _giong_viet
    if _giong_viet is None:
        thu_muc_goc = Path(__file__).resolve().parents[4]
        tep_model = thu_muc_goc / "models/piper/vi_VN-vais1000-medium.onnx"
        if not tep_model.is_file():
            raise RuntimeError("Chưa có model giọng Việt Piper vi_VN-vais1000-medium")
        _giong_viet = PiperVoice.load(str(tep_model))
    return _giong_viet


def _tao_giong_doc(cac_doan: list[OcrSegment], thu_muc_tam: Path, bao_cao_tien_do: Callable[[int, int], None] | None = None) -> list[Path]:
    cac_tep_am_thanh: list[Path] = []
    giong_viet = _lay_giong_viet()
    for vi_tri, doan in enumerate(cac_doan):
        tep_wav = thu_muc_tam / f"giong-{vi_tri:03d}.wav"
        with wave.open(str(tep_wav), "wb") as tep_am_thanh:
            giong_viet.synthesize_wav(doan.translatedText, tep_am_thanh)
        cac_tep_am_thanh.append(tep_wav)
        if bao_cao_tien_do:
            bao_cao_tien_do(vi_tri + 1, len(cac_doan))
    return cac_tep_am_thanh


def tao_giong_cho_doan(project_id: str, segment_id: str, noi_dung: str) -> tuple[Path, int]:
    thu_muc_goc = Path(__file__).resolve().parents[4]
    thu_muc_am_thanh = thu_muc_goc / "data/audio" / project_id
    thu_muc_am_thanh.mkdir(parents=True, exist_ok=True)
    tep_wav = thu_muc_am_thanh / f"{segment_id}.wav"
    tep_tam = tep_wav.with_suffix(".tmp.wav")
    with wave.open(str(tep_tam), "wb") as tep_am_thanh:
        _lay_giong_viet().synthesize_wav(noi_dung, tep_am_thanh)
    tep_tam.replace(tep_wav)
    with wave.open(str(tep_wav), "rb") as tep_am_thanh:
        thoi_luong_ms = round(tep_am_thanh.getnframes() / max(tep_am_thanh.getframerate(), 1) * 1000)
    return tep_wav, thoi_luong_ms


def _dinh_dang_ass(thoi_gian_ms: int) -> str:
    tong_giay, mili_giay = divmod(max(thoi_gian_ms, 0), 1000)
    gio, phan_con_lai = divmod(tong_giay, 3600)
    phut, giay = divmod(phan_con_lai, 60)
    return f"{gio}:{phut:02d}:{giay:02d}.{mili_giay // 10:02d}"


def _tao_tep_phu_de(cac_doan: list[OcrSegment], tep_ass: Path) -> None:
    dau_tep = """[Script Info]\nScriptType: v4.00+\nPlayResX: 960\nPlayResY: 540\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: VietVoice,Arial,30,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,1,2,40,40,28,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"""
    cac_dong = []
    for doan in cac_doan:
        noi_dung = doan.translatedText.replace("\n", "\\N").replace(",", "，")
        cac_dong.append(f"Dialogue: 0,{_dinh_dang_ass(doan.startMs)},{_dinh_dang_ass(doan.endMs)},VietVoice,,0,0,0,,{noi_dung}")
    tep_ass.write_text(dau_tep + "\n".join(cac_dong), encoding="utf-8-sig")


def _xoa_phu_de_toan_video(duong_dan_nguon: Path, tep_video_khong_chu: Path, vung: NormalizedRegion, bao_cao_tien_do: Callable[[int, int], None] | None = None) -> None:
    video_vao = cv2.VideoCapture(str(duong_dan_nguon))
    if not video_vao.isOpened():
        raise RuntimeError("Không thể mở video để xóa phụ đề")
    chieu_rong = int(video_vao.get(cv2.CAP_PROP_FRAME_WIDTH))
    chieu_cao = int(video_vao.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = max(video_vao.get(cv2.CAP_PROP_FPS), 1.0)
    video_ra = cv2.VideoWriter(str(tep_video_khong_chu), cv2.VideoWriter_fourcc(*"mp4v"), fps, (chieu_rong, chieu_cao))
    # Mở rộng đủ để che cả viền đen bao quanh chữ trắng; bộ lọc hàng ngang ở
    # TextMaskGenerator giữ phần mở rộng này không lan lên khuôn mặt hoặc trang phục.
    cau_hinh = RemovalSettings(method="TELEA", inpaintRadius=3, maskDilation=7, edgeFeathering=1)
    tao_mask = TextMaskGenerator()
    bo_khoi_phuc = create_inpainting_engine("opencv-fast", cau_hinh)
    tong_so_khung = max(int(video_vao.get(cv2.CAP_PROP_FRAME_COUNT)), 1)
    so_khung_da_xu_ly = 0
    try:
        while True:
            doc_duoc, khung_hinh = video_vao.read()
            if not doc_duoc or khung_hinh is None:
                break
            mask, _ = tao_mask.generate(khung_hinh, [vung], cau_hinh)
            video_ra.write(bo_khoi_phuc.process_frame(khung_hinh, mask))
            so_khung_da_xu_ly += 1
            if bao_cao_tien_do and (so_khung_da_xu_ly % 10 == 0 or so_khung_da_xu_ly == tong_so_khung):
                bao_cao_tien_do(so_khung_da_xu_ly, tong_so_khung)
    finally:
        video_vao.release()
        video_ra.release()


def _ghep_video(tep_video: Path, tep_nguon: Path, tep_ass: Path, cac_tep_giong: list[Path], cac_doan: list[OcrSegment], tep_dich: Path) -> None:
    lenh = [_tim_ffmpeg(), "-y", "-i", str(tep_video), "-i", str(tep_nguon)]
    for tep_giong in cac_tep_giong:
        lenh.extend(["-i", str(tep_giong)])

    cac_bo_loc_am_thanh = ["[1:a]volume=0.16[am_goc]"]
    cac_nhan_am_thanh = ["[am_goc]"]
    for vi_tri, doan in enumerate(cac_doan):
        chi_so_dau_vao = vi_tri + 2
        nhan = f"giong{vi_tri}"
        cac_bo_loc_am_thanh.append(f"[{chi_so_dau_vao}:a]adelay={doan.startMs}|{doan.startMs}[{nhan}]")
        cac_nhan_am_thanh.append(f"[{nhan}]")
    cac_bo_loc_am_thanh.append(f"{''.join(cac_nhan_am_thanh)}amix=inputs={len(cac_nhan_am_thanh)}:duration=longest:normalize=0[am_thanh]")
    duong_dan_ass = str(tep_ass).replace("\\", "/").replace(":", "\\:").replace("'", "\\'")
    lenh.extend([
        "-filter_complex", ";".join(cac_bo_loc_am_thanh),
        "-vf", f"subtitles=filename='{duong_dan_ass}'",
        "-map", "0:v", "-map", "[am_thanh]", "-c:v", "libx264", "-preset", "fast", "-crf", "20",
        "-c:a", "aac", "-b:a", "192k", "-shortest", str(tep_dich),
    ])
    ket_qua = subprocess.run(lenh, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if ket_qua.returncode != 0:
        raise RuntimeError(f"FFmpeg không thể xuất video: {ket_qua.stderr[-2000:]}")


def process_automatic_pipeline(request: AutomaticPipelineRequest, bao_cao_giai_doan: Callable[[str, int, int], None] | None = None, luu_ket_qua_trung_gian: Callable[[str, list[OcrSegment]], None] | None = None) -> AutomaticPipelineResponse:
    duong_dan_nguon = Path(request.sourcePath)
    def bao_cao(ten_giai_doan: str, da_xu_ly: int, tong_so: int) -> None:
        if bao_cao_giai_doan:
            bao_cao_giai_doan(ten_giai_doan, da_xu_ly, tong_so)

    if not duong_dan_nguon.is_file():
        raise RuntimeError(f"Không tìm thấy video nguồn: {duong_dan_nguon}")
    _tim_ffmpeg()
    bao_cao("PROBE", 1, 1)

    cac_doan = detect_subtitles(
        OcrRequest(projectId=request.projectId, sourcePath=request.sourcePath, region=request.region),
        lambda da_xu_ly, tong_so: bao_cao("OCR", da_xu_ly, tong_so),
    ).segments
    if not cac_doan:
        raise RuntimeError("Không nhận dạng được phụ đề Trung Quốc trong vùng đã chọn")
    if luu_ket_qua_trung_gian:
        luu_ket_qua_trung_gian("OCR", cac_doan)
    for vi_tri, doan in enumerate(cac_doan, start=1):
        doan.translatedText = _dich_sang_tieng_viet(doan.originalText)
        doan.status = "TRANSLATED"
        bao_cao("TRANSLATION", vi_tri, len(cac_doan))
    if luu_ket_qua_trung_gian:
        luu_ket_qua_trung_gian("TRANSLATION", cac_doan)

    thu_muc_dich = duong_dan_nguon.parent / "VietVoice_Output"
    thu_muc_dich.mkdir(parents=True, exist_ok=True)
    tep_dich = thu_muc_dich / f"{duong_dan_nguon.stem}_vietvoice.mp4"
    vung_xoa_chu = NormalizedRegion(
        x=request.region.x,
        y=request.region.y,
        width=request.region.width,
        height=request.region.height,
    )
    with tempfile.TemporaryDirectory(prefix="vietvoice-") as thu_muc_tam_text:
        thu_muc_tam = Path(thu_muc_tam_text)
        tep_video_khong_chu = thu_muc_tam / "video-khong-chu.mp4"
        tep_ass = thu_muc_tam / "phu-de-viet.ass"
        _xoa_phu_de_toan_video(
            duong_dan_nguon,
            tep_video_khong_chu,
            vung_xoa_chu,
            lambda da_xu_ly, tong_so: bao_cao("SUBTITLE_REMOVAL", da_xu_ly, tong_so),
        )
        _tao_tep_phu_de(cac_doan, tep_ass)
        bao_cao("SUBTITLE_RENDER", 1, 1)
        cac_tep_giong = _tao_giong_doc(cac_doan, thu_muc_tam, lambda da_xu_ly, tong_so: bao_cao("TTS", da_xu_ly, tong_so))
        bao_cao("AUDIO_ALIGNMENT", 1, 1)
        bao_cao("EXPORT", 0, 1)
        _ghep_video(tep_video_khong_chu, duong_dan_nguon, tep_ass, cac_tep_giong, cac_doan, tep_dich)
        bao_cao("EXPORT", 1, 1)
        video_kiem_tra = cv2.VideoCapture(str(tep_dich))
        hop_le = video_kiem_tra.isOpened() and int(video_kiem_tra.get(cv2.CAP_PROP_FRAME_COUNT)) > 0
        video_kiem_tra.release()
        if not hop_le or not tep_dich.is_file() or tep_dich.stat().st_size == 0:
            raise RuntimeError("Video xuất không vượt qua bước kiểm tra tính hợp lệ")
        bao_cao("VALIDATION", 1, 1)
    return AutomaticPipelineResponse(outputPath=str(tep_dich), segments=cac_doan, completedSteps=["ocr", "translate", "inpaint", "tts", "subtitle", "export"])


def create_preview_proxy(project_id: str, source_path: str) -> Path:
    thu_muc_goc = Path(__file__).resolve().parents[4]
    thu_muc_proxy = thu_muc_goc / "data/previews"
    thu_muc_proxy.mkdir(parents=True, exist_ok=True)
    tep_proxy = thu_muc_proxy / f"{project_id}.webm"
    if tep_proxy.is_file() and tep_proxy.stat().st_size > 0:
        return tep_proxy

    tep_tam = tep_proxy.with_suffix(".tmp.webm")
    lenh = [
        _tim_ffmpeg(), "-y", "-i", source_path,
        "-vf", "scale='min(960,iw)':-2", "-c:v", "libvpx", "-deadline", "realtime", "-cpu-used", "8",
        "-b:v", "1200k", "-pix_fmt", "yuv420p", "-c:a", "libopus", "-b:a", "96k", str(tep_tam),
    ]
    ket_qua = subprocess.run(lenh, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if ket_qua.returncode != 0:
        raise RuntimeError(f"Không thể tạo proxy xem trước: {ket_qua.stderr[-1500:]}")
    tep_tam.replace(tep_proxy)
    return tep_proxy


def create_video_poster(project_id: str, source_path: str) -> Path:
    thu_muc_goc = Path(__file__).resolve().parents[4]
    thu_muc_poster = thu_muc_goc / "data/posters"
    thu_muc_poster.mkdir(parents=True, exist_ok=True)
    tep_poster = thu_muc_poster / f"{project_id}.jpg"
    if tep_poster.is_file() and tep_poster.stat().st_size > 0:
        return tep_poster
    video = cv2.VideoCapture(source_path)
    try:
        if not video.isOpened():
            raise RuntimeError("Không thể mở video để tạo ảnh đại diện")
        thoi_luong_ms = video.get(cv2.CAP_PROP_FRAME_COUNT) / max(video.get(cv2.CAP_PROP_FPS), 1) * 1000
        video.set(cv2.CAP_PROP_POS_MSEC, min(max(1000, thoi_luong_ms * 0.1), max(0, thoi_luong_ms - 100)))
        doc_duoc, khung_hinh = video.read()
        if not doc_duoc or khung_hinh is None:
            video.set(cv2.CAP_PROP_POS_MSEC, 0)
            doc_duoc, khung_hinh = video.read()
        if not doc_duoc or khung_hinh is None:
            raise RuntimeError("Không đọc được frame hợp lệ để tạo ảnh đại diện")
        tep_tam = tep_poster.with_suffix(".tmp.jpg")
        if not cv2.imwrite(str(tep_tam), khung_hinh):
            raise RuntimeError("Không ghi được ảnh đại diện video")
        tep_tam.replace(tep_poster)
        return tep_poster
    finally:
        video.release()
