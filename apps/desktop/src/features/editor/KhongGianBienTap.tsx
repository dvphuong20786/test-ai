import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, FolderOpen, Redo2, Save, Undo2, WandSparkles } from "lucide-react";
import type { OcrRegion, ProcessingJob, SubtitleSegment, VideoProject } from "@vietdub/shared";
import { BangPhuDe } from "./BangPhuDe";
import { DongThoiGian } from "./DongThoiGian";
import { TrinhPhatVideo } from "./TrinhPhatVideo";
import { generateSegmentVoice, getSegmentVoiceUrl, mergeSubtitleSegments, splitSubtitleSegment } from "../../services/api";

type CheDoBienTap = "ocr" | "dich" | "giong" | "kiem-tra" | "xuat";

interface ThuocTinhKhongGianBienTap {
  duAn: VideoProject;
  cacDoanPhuDe: SubtitleSegment[];
  vungOcr: OcrRegion;
  dangXuLy: boolean;
  thongBao: string;
  congViecDangChay?: ProcessingJob;
  duongDanVideoDaXuat?: string;
  khiChayTuDong(): void;
  khiHuyXuLy(): void;
  khiDoiVideo(): void;
  khiChayOcr(): void;
  khiDoiVungOcr(vungMoi: OcrRegion): void;
  khiCapNhatCacDoan(cacDoanMoi: SubtitleSegment[]): void;
  khiLuuDoan(doanPhuDe: SubtitleSegment): Promise<void>;
  khiKhoiPhucDoan(maDoan: string): void;
  khiMoCongCuXoaChu(): void;
  khiDoiThongBao(thongBao: string): void;
  khiDoiTrangThaiChuaLuu(coThayDoi: boolean): void;
  trangThaiOcr: "NOT_STARTED" | "RUNNING" | "EMPTY" | "FAILED" | "READY";
}

const CAC_CHE_DO: Array<{ ma: CheDoBienTap; ten: string; trangThai: string }> = [
  { ma: "ocr", ten: "1. Nhận diện & xóa chữ", trangThai: "PaddleOCR + OpenCV" },
  { ma: "dich", ten: "2. Dịch tiếng Việt", trangThai: "Argos local" },
  { ma: "giong", ten: "3. Tạo giọng AI", trangThai: "Piper local" },
  { ma: "kiem-tra", ten: "4. Kiểm tra kết quả", trangThai: "Xem thủ công" },
  { ma: "xuat", ten: "5. Xuất video", trangThai: "FFmpeg MP4" }
];

const NHAN_GIAI_DOAN: Record<string, string> = {
  PREPARING: "Chuẩn bị mô hình",
  PROBE: "Kiểm tra video và FFmpeg",
  FRAME_EXTRACTION: "Trích xuất khung hình",
  OCR: "Nhận diện phụ đề Trung",
  TRANSLATION: "Dịch sang tiếng Việt",
  MASK_GENERATION: "Tạo mặt nạ chữ",
  SUBTITLE_REMOVAL: "Xóa phụ đề Trung",
  TTS: "Tạo giọng đọc Việt",
  AUDIO_ALIGNMENT: "Đồng bộ âm thanh",
  SUBTITLE_RENDER: "Tạo phụ đề Việt",
  EXPORT: "Đóng gói MP4",
  VALIDATION: "Kiểm tra video đầu ra",
  COMPLETED: "Hoàn tất"
};

export function KhongGianBienTap({ duAn, cacDoanPhuDe, vungOcr, dangXuLy, thongBao, congViecDangChay, duongDanVideoDaXuat, khiChayTuDong, khiHuyXuLy, khiDoiVideo, khiChayOcr, khiDoiVungOcr, khiCapNhatCacDoan, khiLuuDoan, khiKhoiPhucDoan, khiMoCongCuXoaChu, khiDoiThongBao, khiDoiTrangThaiChuaLuu, trangThaiOcr }: ThuocTinhKhongGianBienTap) {
  const [cheDo, setCheDo] = useState<CheDoBienTap>("ocr");
  const [maDoanDangChon, setMaDoanDangChon] = useState<string | undefined>(() => localStorage.getItem(`vietdub.selectedSegment.${duAn.id}`) || undefined);
  const [thoiGianHienTaiMs, setThoiGianHienTaiMs] = useState(0);
  const [dangPhat, setDangPhat] = useState(false);
  const [mucThuPhong, setMucThuPhong] = useState(1);
  const [anBangCongCu, setAnBangCongCu] = useState(false);
  const [lichSuLui, setLichSuLui] = useState<SubtitleSegment[][]>([]);
  const [lichSuTien, setLichSuTien] = useState<SubtitleSegment[][]>([]);
  const [dangLuu, setDangLuu] = useState(false);
  const [coThayDoiChuaLuu, setCoThayDoiChuaLuu] = useState(false);
  const [chieuRongBangCongCu, setChieuRongBangCongCu] = useState(() => Number(localStorage.getItem("vietdub.toolWidth")) || 235);
  const [chieuRongBangPhuDe, setChieuRongBangPhuDe] = useState(() => Number(localStorage.getItem("vietdub.subtitleWidth")) || 480);
  const [hienXacNhanPipeline, setHienXacNhanPipeline] = useState(false);
  const [thoiGianHienTai, setThoiGianHienTai] = useState(Date.now());
  const [anTrungTamXuLy, setAnTrungTamXuLy] = useState(false);
  const thamChieuVideo = useRef<HTMLVideoElement>(null);
  const boHenLuu = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const boHenDungXemThu = useRef<number | undefined>(undefined);
  const doanDangChon = cacDoanPhuDe.find(doan => doan.id === maDoanDangChon);
  const noiDungHuongDanTheoCheDo: Record<CheDoBienTap, { tieuDe: string; noiDung: string }> = {
    ocr: {
      tieuDe: "Video đã được nhập thành công",
      noiDung: cacDoanPhuDe.length === 0
        ? "Bước tiếp theo: phát thử video, kiểm tra vùng phụ đề rồi bấm “Chạy OCR kiểm thử”."
        : "Đã có dữ liệu OCR kiểm thử: kiểm tra nội dung nhận dạng trong bảng bên phải."
    },
    dich: { tieuDe: "Dịch phụ đề sang tiếng Việt", noiDung: "Nút xử lý tự động dùng Argos local; bạn vẫn có thể sửa bản dịch trong bảng bên phải." },
    giong: { tieuDe: "Tạo giọng đọc tiếng Việt", noiDung: "Nút xử lý tự động dùng giọng Việt Piper local và đặt âm thanh theo timestamp OCR." },
    "kiem-tra": { tieuDe: "Rà soát kết quả", noiDung: "Kiểm tra thời gian, chữ Trung và bản dịch của từng dòng trong bảng phụ đề." },
    xuat: { tieuDe: "Xuất video hoàn chỉnh", noiDung: "Bấm nút xử lý tự động phía trên; FFmpeg sẽ tạo MP4 trong thư mục VietDub_Output cạnh video nguồn." }
  };
  const huongDanDangChon = noiDungHuongDanTheoCheDo[cheDo];
  const soBuocDangChon = CAC_CHE_DO.findIndex(muc => muc.ma === cheDo) + 1;
  const tenGiaiDoanDangChay = congViecDangChay ? NHAN_GIAI_DOAN[congViecDangChay.stage] || congViecDangChay.stage : "";
  const thoiLuongCongViecGiay = congViecDangChay?.startedAt
    ? Math.max(0, Math.round((thoiGianHienTai - Date.parse(congViecDangChay.startedAt)) / 1000))
    : 0;
  const soDoanDaNhanDien = congViecDangChay?.result?.segments.length
    ?? (["TRANSLATION", "SUBTITLE_REMOVAL", "SUBTITLE_RENDER", "TTS", "AUDIO_ALIGNMENT", "EXPORT", "VALIDATION", "COMPLETED"].includes(congViecDangChay?.stage || "") ? congViecDangChay?.total || 0 : 0);
  const soDoanDaDich = congViecDangChay?.stage === "TRANSLATION" ? congViecDangChay.processed : congViecDangChay?.result?.segments.filter(doan => doan.translatedText).length || 0;
  const soGiongDaTao = congViecDangChay?.stage === "TTS" ? congViecDangChay.processed : (["AUDIO_ALIGNMENT", "EXPORT", "VALIDATION", "COMPLETED"].includes(congViecDangChay?.stage || "") ? soDoanDaNhanDien : 0);

  useEffect(() => {
    if (congViecDangChay?.status !== "RUNNING") return;
    const boDem = window.setInterval(() => setThoiGianHienTai(Date.now()), 1000);
    return () => window.clearInterval(boDem);
  }, [congViecDangChay?.status]);

  useEffect(() => {
    if (congViecDangChay?.id) setAnTrungTamXuLy(false);
  }, [congViecDangChay?.id]);

  function chonDoanPhuDe(doanPhuDe: SubtitleSegment): void {
    setMaDoanDangChon(doanPhuDe.id);
    localStorage.setItem(`vietdub.selectedSegment.${duAn.id}`, doanPhuDe.id);
    setThoiGianHienTaiMs(doanPhuDe.startMs);
    if (thamChieuVideo.current) thamChieuVideo.current.currentTime = doanPhuDe.startMs / 1000;
  }

  function suaNoiDungDoan(maDoan: string, truong: "originalText" | "translatedText", noiDung: string): void {
    setCoThayDoiChuaLuu(true);
    khiDoiTrangThaiChuaLuu(true);
    setLichSuLui(lichSu => [...lichSu.slice(-39), cacDoanPhuDe]);
    setLichSuTien([]);
    const cacDoanMoi = cacDoanPhuDe.map(doan => doan.id === maDoan ? { ...doan, [truong]: noiDung, status: truong === "translatedText" ? "TRANSLATED" as const : doan.status, audioAssetId: truong === "translatedText" ? undefined : doan.audioAssetId } : doan);
    khiCapNhatCacDoan(cacDoanMoi);
    const doanMoi = cacDoanMoi.find(doan => doan.id === maDoan);
    if (!doanMoi) return;
    if (boHenLuu.current) clearTimeout(boHenLuu.current);
    boHenLuu.current = setTimeout(async () => {
      setDangLuu(true);
      await khiLuuDoan(doanMoi);
      setDangLuu(false);
      setCoThayDoiChuaLuu(false);
      khiDoiTrangThaiChuaLuu(false);
    }, 900);
  }

  function luiThaoTac(): void {
    const trangThaiTruoc = lichSuLui.at(-1);
    if (!trangThaiTruoc) return;
    setLichSuTien(lichSu => [cacDoanPhuDe, ...lichSu].slice(0, 40));
    setLichSuLui(lichSu => lichSu.slice(0, -1));
    khiCapNhatCacDoan(trangThaiTruoc);
  }

  function tienThaoTac(): void {
    const trangThaiTiep = lichSuTien[0];
    if (!trangThaiTiep) return;
    setLichSuLui(lichSu => [...lichSu, cacDoanPhuDe].slice(-40));
    setLichSuTien(lichSu => lichSu.slice(1));
    khiCapNhatCacDoan(trangThaiTiep);
  }

  async function luuDoanDangChon(): Promise<void> {
    if (!doanDangChon) return;
    setDangLuu(true);
    await khiLuuDoan(doanDangChon);
    setDangLuu(false);
    setCoThayDoiChuaLuu(false);
    khiDoiTrangThaiChuaLuu(false);
  }

  function chonThoiGian(thoiGianMs: number): void {
    setThoiGianHienTaiMs(thoiGianMs);
    if (thamChieuVideo.current) thamChieuVideo.current.currentTime = thoiGianMs / 1000;
  }

  function batDauDoiKichThuocBang(loaiBang: "cong-cu" | "phu-de", suKienBatDau: React.PointerEvent<HTMLDivElement>): void {
    const boCuc = suKienBatDau.currentTarget.parentElement;
    if (!boCuc) return;
    const khungBoCuc = boCuc.getBoundingClientRect();
    function khiKeo(suKien: PointerEvent): void {
      if (loaiBang === "cong-cu") {
        const chieuRongMoi = Math.max(180, Math.min(380, suKien.clientX - khungBoCuc.left));
        setChieuRongBangCongCu(chieuRongMoi);
        localStorage.setItem("vietdub.toolWidth", String(chieuRongMoi));
        return;
      }
      const chieuRongMoi = Math.max(340, Math.min(720, khungBoCuc.right - suKien.clientX));
      setChieuRongBangPhuDe(chieuRongMoi);
      localStorage.setItem("vietdub.subtitleWidth", String(chieuRongMoi));
    }
    function khiTha(): void {
      window.removeEventListener("pointermove", khiKeo);
      window.removeEventListener("pointerup", khiTha);
    }
    window.addEventListener("pointermove", khiKeo);
    window.addEventListener("pointerup", khiTha);
  }

  async function tachDoanDangChon(): Promise<void> {
    if (!doanDangChon) return;
    if (thoiGianHienTaiMs <= doanDangChon.startMs || thoiGianHienTaiMs >= doanDangChon.endMs) {
      khiDoiThongBao("Hãy đặt playhead vào bên trong đoạn đang chọn rồi tách.");
      return;
    }
    const cacDoanMoi = await splitSubtitleSegment(doanDangChon, thoiGianHienTaiMs);
    khiCapNhatCacDoan(cacDoanMoi);
    khiDoiThongBao("Đã tách đoạn tại vị trí playhead.");
  }

  async function gopDoanTiepTheo(): Promise<void> {
    if (!doanDangChon) return;
    const viTriDangChon = cacDoanPhuDe.findIndex(doan => doan.id === doanDangChon.id);
    const doanTiepTheo = cacDoanPhuDe[viTriDangChon + 1];
    if (!doanTiepTheo) {
      khiDoiThongBao("Không có đoạn kế tiếp để gộp.");
      return;
    }
    const cacDoanMoi = await mergeSubtitleSegments(doanDangChon, doanTiepTheo);
    khiCapNhatCacDoan(cacDoanMoi);
    khiDoiThongBao("Đã gộp đoạn đang chọn với đoạn kế tiếp.");
  }

  async function luuThoiGianDoan(doanDaSua: SubtitleSegment): Promise<void> {
    setLichSuLui(lichSu => [...lichSu.slice(-39), cacDoanPhuDe]);
    setLichSuTien([]);
    const cacDoanMoi = cacDoanPhuDe
      .map(doan => doan.id === doanDaSua.id ? doanDaSua : doan)
      .sort((doanA, doanB) => doanA.startMs - doanB.startMs);
    khiCapNhatCacDoan(cacDoanMoi);
    setDangLuu(true);
    setCoThayDoiChuaLuu(true);
    khiDoiTrangThaiChuaLuu(true);
    try {
      await khiLuuDoan(doanDaSua);
      setCoThayDoiChuaLuu(false);
      khiDoiTrangThaiChuaLuu(false);
      khiDoiThongBao("Đã lưu vị trí đoạn phụ đề trên timeline.");
    } finally {
      setDangLuu(false);
    }
  }

  function xemThuDoanDangChon(): void {
    if (!doanDangChon || !thamChieuVideo.current) return;
    if (boHenDungXemThu.current) window.clearTimeout(boHenDungXemThu.current);
    thamChieuVideo.current.currentTime = doanDangChon.startMs / 1000;
    void thamChieuVideo.current.play();
    boHenDungXemThu.current = window.setTimeout(() => thamChieuVideo.current?.pause(), Math.max(100, doanDangChon.endMs - doanDangChon.startMs));
  }

  async function taoLaiGiongDoanDangChon(): Promise<void> {
    if (!doanDangChon?.translatedText.trim()) {
      khiDoiThongBao("Hãy nhập bản dịch tiếng Việt trước khi tạo giọng AI.");
      return;
    }
    try {
      khiDoiThongBao("Đang tạo lại giọng Việt cho câu đang chọn…");
      const doanCoGiongMoi = await generateSegmentVoice(doanDangChon);
      khiCapNhatCacDoan(cacDoanPhuDe.map(doan => doan.id === doanCoGiongMoi.id ? doanCoGiongMoi : doan));
      const amThanh = new Audio(getSegmentVoiceUrl(doanCoGiongMoi));
      await amThanh.play();
      khiDoiThongBao(`Đã tạo và phát thử giọng AI (${doanCoGiongMoi.audioDurationMs || 0} ms).`);
    } catch (loi) {
      khiDoiThongBao(loi instanceof Error ? loi.message : "Không thể tạo lại giọng AI.");
    }
  }

  useEffect(() => {
    function khiBamPhim(suKien: KeyboardEvent): void {
      const theDangNhap = document.activeElement?.tagName;
      const dangNhapLieu = theDangNhap === "INPUT" || theDangNhap === "TEXTAREA" || theDangNhap === "SELECT";
      if (dangNhapLieu && !(suKien.ctrlKey && ["s", "z", "y", "f"].includes(suKien.key.toLowerCase()))) return;
      if (suKien.code === "Space") { suKien.preventDefault(); thamChieuVideo.current?.paused ? void thamChieuVideo.current.play() : thamChieuVideo.current?.pause(); }
      if (suKien.ctrlKey && suKien.key.toLowerCase() === "s") { suKien.preventDefault(); void luuDoanDangChon(); }
      if (suKien.ctrlKey && suKien.key.toLowerCase() === "z") { suKien.preventDefault(); luiThaoTac(); }
      if (suKien.ctrlKey && suKien.key.toLowerCase() === "y") { suKien.preventDefault(); tienThaoTac(); }
      if (suKien.ctrlKey && suKien.key.toLowerCase() === "o") { suKien.preventDefault(); khiDoiVideo(); }
      if (suKien.ctrlKey && suKien.key.toLowerCase() === "f") { suKien.preventDefault(); document.querySelector<HTMLInputElement>('input[aria-label="Tìm phụ đề"]')?.focus(); }
      if (suKien.ctrlKey && suKien.key.toLowerCase() === "e") { suKien.preventDefault(); khiChayTuDong(); }
      if (suKien.altKey && (suKien.key === "ArrowLeft" || suKien.key === "ArrowRight")) {
        const viTri = Math.max(0, cacDoanPhuDe.findIndex(doan => doan.id === maDoanDangChon));
        const viTriMoi = Math.max(0, Math.min(cacDoanPhuDe.length - 1, viTri + (suKien.key === "ArrowLeft" ? -1 : 1)));
        if (cacDoanPhuDe[viTriMoi]) chonDoanPhuDe(cacDoanPhuDe[viTriMoi]);
      }
    }
    window.addEventListener("keydown", khiBamPhim);
    return () => window.removeEventListener("keydown", khiBamPhim);
  });

  return (
    <main className="khong-gian-bien-tap">
      <header className="thanh-tren-bien-tap">
        <div><strong>{duAn.name}</strong><span className={`trang-thai-luu ${coThayDoiChuaLuu ? "chua-luu" : ""}`}>{dangLuu ? "Đang lưu…" : coThayDoiChuaLuu ? "Chưa lưu" : "Đã lưu"}</span></div>
        <div className="nhom-thao-tac"><button title="Mở video khác (Ctrl+O)" onClick={khiDoiVideo}><FolderOpen size={16} /><span>Mở video khác</span></button><button title="Lưu (Ctrl+S)" onClick={() => void luuDoanDangChon()}><Save size={16} /></button><button title="Hoàn tác (Ctrl+Z)" onClick={luiThaoTac}><Undo2 size={16} /></button><button title="Làm lại (Ctrl+Y)" onClick={tienThaoTac}><Redo2 size={16} /></button></div>
        <div className="thong-bao-cong-viec">{thongBao}{congViecDangChay?.total ? <progress value={congViecDangChay.processed} max={congViecDangChay.total} /> : null}</div>
        {congViecDangChay?.status === "RUNNING" && <button className="nut-huy-xu-ly" onClick={khiHuyXuLy}>Hủy xử lý</button>}
        {duongDanVideoDaXuat ? <button className="nut-xuat-video" onClick={() => void window.vietdubDesktop?.showOutputFile(duongDanVideoDaXuat)}><Download size={16} /> Mở video đã xuất</button> : <button className="nut-tu-dong" disabled={dangXuLy} onClick={() => setHienXacNhanPipeline(true)}><WandSparkles size={16} /> {dangXuLy ? tenGiaiDoanDangChay || "Đang xử lý…" : "Xử lý toàn bộ & xuất MP4"}</button>}
      </header>
      {congViecDangChay && !anTrungTamXuLy ? <details className="trung-tam-xu-ly" open={congViecDangChay.status === "RUNNING"}>
        <summary>Trung tâm xử lý · {tenGiaiDoanDangChay} · {congViecDangChay.status}</summary>
        <div className="noi-dung-trung-tam-xu-ly"><span>{congViecDangChay.message}</span><code>{congViecDangChay.total > 0 ? `${congViecDangChay.processed}/${congViecDangChay.total}` : "Đang xác định khối lượng…"}</code><span>Thời gian: {thoiLuongCongViecGiay} giây</span><span>OCR: {soDoanDaNhanDien} câu · Đã dịch: {soDoanDaDich} · Giọng AI: {soGiongDaTao}</span>{congViecDangChay.completedStages && <span>Đã xong: {congViecDangChay.completedStages.map(giaiDoan => NHAN_GIAI_DOAN[giaiDoan] || giaiDoan).join(" → ") || "Chưa có"}</span>}{congViecDangChay.error && <span className="loi-cong-viec">{congViecDangChay.error}</span>}{congViecDangChay.logs && <details className="nhat-ky-cong-viec"><summary>Mở nhật ký kỹ thuật ({congViecDangChay.logs.length})</summary><pre>{congViecDangChay.logs.join("\n")}</pre></details>}{["FAILED", "CANCELLED"].includes(congViecDangChay.status) && <button onClick={() => setHienXacNhanPipeline(true)}>Thử lại toàn bộ</button>}<button onClick={() => setAnTrungTamXuLy(true)}>Đóng bảng tiến trình (không hủy)</button></div>
      </details> : congViecDangChay ? <button className="nut-mo-trung-tam-xu-ly" onClick={() => setAnTrungTamXuLy(false)}>Xem tiến trình · {tenGiaiDoanDangChay}</button> : <div className="trung-tam-xu-ly-trong" />}
      <div className="thanh-che-do">{CAC_CHE_DO.map(muc => <button className={cheDo === muc.ma ? "dang-chon" : ""} key={muc.ma} onClick={() => setCheDo(muc.ma)}><strong>{muc.ten}</strong><small>{muc.trangThai}</small></button>)}</div>
      <div className="thanh-huong-dan"><span className="so-buoc-hien-tai">{soBuocDangChon}</span><div><strong>{huongDanDangChon.tieuDe}</strong><p>{huongDanDangChon.noiDung}</p></div>{cheDo === "ocr" && <span className="nhan-gioi-han">Pipeline chạy local trên máy</span>}</div>
      <div className={`bo-cuc-bien-tap ${anBangCongCu ? "an-cong-cu" : ""}`} style={{ "--chieu-rong-cong-cu": `${chieuRongBangCongCu}px`, "--chieu-rong-phu-de": `${chieuRongBangPhuDe}px` } as React.CSSProperties}>
        <aside className="bang-cong-cu">
          <button className="nut-thu-gon" onClick={() => setAnBangCongCu(true)}><ChevronLeft size={16} /> Thu gọn</button>
          {cheDo === "ocr" && <><h3>Bước 1 — Nhận diện phụ đề</h3><details className="chi-tiet-video"><summary>Thông tin video nguồn</summary><dl><dt>Đường dẫn</dt><dd title={duAn.sourcePath}>{duAn.sourcePath}</dd><dt>Thời lượng</dt><dd>{Math.round(duAn.metadata.durationMs / 100) / 10} giây</dd><dt>Độ phân giải</dt><dd>{duAn.metadata.width} × {duAn.metadata.height}</dd><dt>Định dạng</dt><dd>{duAn.metadata.videoCodec}{duAn.metadata.audioCodec ? ` / ${duAn.metadata.audioCodec}` : ""}</dd></dl></details><ol className="danh-sach-thao-tac"><li>Bấm nút ▶ để phát thử video.</li><li>Kiểm tra phụ đề nằm trong vùng phía dưới.</li><li>Điều chỉnh vùng nếu phụ đề bị lệch.</li><li>Bấm xử lý tự động ở thanh trên để xuất MP4.</li></ol><details className="cau-hinh-vung-ocr"><summary>Điều chỉnh vùng nhận diện</summary><div className="luoi-vung-ocr"><label>Lề trái (x)<input type="number" step="0.01" min="0" max="1" value={vungOcr.x} onChange={suKien => khiDoiVungOcr({ ...vungOcr, x: Number(suKien.target.value) })} /></label><label>Vị trí từ trên (y)<input type="number" step="0.01" min="0" max="1" value={vungOcr.y} onChange={suKien => khiDoiVungOcr({ ...vungOcr, y: Number(suKien.target.value) })} /></label><label>Chiều rộng<input type="number" step="0.01" min="0" max="1" value={vungOcr.width} onChange={suKien => khiDoiVungOcr({ ...vungOcr, width: Number(suKien.target.value) })} /></label><label>Chiều cao<input type="number" step="0.01" min="0" max="1" value={vungOcr.height} onChange={suKien => khiDoiVungOcr({ ...vungOcr, height: Number(suKien.target.value) })} /></label></div></details><button className="nut-chinh nut-thao-tac-chinh" onClick={khiChayOcr}>Chạy riêng OCR thật</button><button onClick={khiMoCongCuXoaChu}>Xem thử công cụ xóa chữ</button></>}
          {cheDo === "dich" && <><h3>Dịch thuật</h3><p className="chu-phu">Argos dịch offline Trung → Anh → Việt. Có thể sửa từng dòng ở bảng bên phải sau khi chạy.</p></>}
          {cheDo === "giong" && <><h3>Giọng AI</h3><p className="chu-phu">Piper dùng model `vi_VN-vais1000-medium` trên máy, không gửi nội dung ra ngoài.</p></>}
          {cheDo === "kiem-tra" && <><h3>Trung tâm lỗi</h3><button onClick={() => khiDoiThongBao("Đang hiển thị các đoạn OCR có độ tin cậy thấp.")}>OCR dưới 70%</button><button onClick={() => khiDoiThongBao("Đang hiển thị các đoạn chưa có bản dịch.")}>Thiếu bản dịch</button></>}
          {cheDo === "xuat" && <><h3>Xuất video</h3><p className="chu-phu">Nút tự động tạo MP4 H.264/AAC trong thư mục `VietDub_Output` cạnh video nguồn.</p></>}
        </aside>
        {!anBangCongCu && <div className="tay-keo-cot tay-keo-cong-cu" onPointerDown={suKien => batDauDoiKichThuocBang("cong-cu", suKien)} />}
        {anBangCongCu && <button className="nut-mo-cong-cu" onClick={() => setAnBangCongCu(false)}><ChevronRight size={16} /></button>}
        <section className="vung-trung-tam"><TrinhPhatVideo duAn={duAn} doanPhuDeDangChon={doanDangChon} thoiGianHienTaiMs={thoiGianHienTaiMs} dangPhat={dangPhat} thamChieuVideo={thamChieuVideo} khiThayDoiThoiGian={setThoiGianHienTaiMs} khiThayDoiTrangThaiPhat={setDangPhat} /></section>
        <aside className="bang-phu-de-ben-phai"><BangPhuDe cacDoanPhuDe={cacDoanPhuDe} maDoanDangChon={maDoanDangChon} khiChonDoan={chonDoanPhuDe} khiSuaNoiDung={suaNoiDungDoan} khiTachDoan={() => void tachDoanDangChon()} khiGopDoanTiepTheo={() => void gopDoanTiepTheo()} khiXemThuDoan={xemThuDoanDangChon} khiTaoLaiGiong={() => void taoLaiGiongDoanDangChon()} khiKhoiPhucDoan={() => maDoanDangChon && khiKhoiPhucDoan(maDoanDangChon)} trangThaiOcr={trangThaiOcr} khiThuLaiOcr={khiChayOcr} /></aside>
        <div className="tay-keo-cot tay-keo-phu-de" onPointerDown={suKien => batDauDoiKichThuocBang("phu-de", suKien)} />
        <footer className="vung-dong-thoi-gian"><div className="thanh-timeline"><strong>Dòng thời gian</strong><label>Thu phóng <input type="range" min="1" max="8" step=".25" value={mucThuPhong} onChange={suKien => setMucThuPhong(Number(suKien.target.value))} /></label></div><DongThoiGian thoiLuongMs={duAn.metadata.durationMs} thoiGianHienTaiMs={thoiGianHienTaiMs} cacDoanPhuDe={cacDoanPhuDe} maDoanDangChon={maDoanDangChon} mucThuPhong={mucThuPhong} khiChonThoiGian={chonThoiGian} khiChonDoan={chonDoanPhuDe} khiLuuThoiGianDoan={doan => void luuThoiGianDoan(doan)} /></footer>
      </div>
      {hienXacNhanPipeline && <div className="lop-phu-xac-nhan"><section className="hop-xac-nhan-pipeline"><h2>Xác nhận xử lý toàn bộ</h2><dl><dt>Video nguồn</dt><dd>{duAn.name}</dd><dt>Vùng OCR</dt><dd>x {vungOcr.x.toFixed(2)} · y {vungOcr.y.toFixed(2)} · rộng {vungOcr.width.toFixed(2)} · cao {vungOcr.height.toFixed(2)}</dd><dt>OCR</dt><dd>PaddleOCR local · chữ Trung</dd><dt>Dịch</dt><dd>Argos local · Trung → Anh → Việt</dd><dt>Giọng đọc</dt><dd>Piper local · vi_VN-vais1000-medium</dd><dt>Xóa chữ</dt><dd>OpenCV inpainting</dd><dt>Đầu ra</dt><dd>MP4 H.264 + AAC + phụ đề Việt</dd></dl><p>Ứng dụng sẽ kiểm tra FFmpeg, model OCR, gói dịch và giọng Việt trước khi bắt đầu. Nếu thiếu, pipeline sẽ không chạy.</p><div><button onClick={() => setHienXacNhanPipeline(false)}>Hủy</button><button className="nut-chinh" onClick={() => { setHienXacNhanPipeline(false); khiChayTuDong(); }}><WandSparkles size={16} /> Bắt đầu xử lý</button></div></section></div>}
    </main>
  );
}
