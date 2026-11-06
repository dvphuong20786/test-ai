import { useEffect, useRef, useState } from "react";
import { FolderOpen, X } from "lucide-react";
import type { OcrRegion, ProcessingJob, SubtitleSegment, VideoProject } from "@vietdub/shared";
import { cancelProcessingJob, checkDependencies, createAutomaticJob, getProjectSegments, importVideo, listProjectJobs, listProjects, observeProcessingJob, relinkProjectSource, runOcr, saveProjectSettings, saveSegment } from "./services/api";
import { KhongGianBienTap } from "./features/editor/KhongGianBienTap";
import { SubtitleRemovalPage } from "./features/subtitle-removal/SubtitleRemovalPage";
import { calculateJobProgressPercent } from "./utils/job-progress";

const VUNG_OCR_MAC_DINH: OcrRegion = { x: 0.08, y: 0.68, width: 0.84, height: 0.3 };

export default function App() {
  const [duAn, setDuAn] = useState<VideoProject>();
  const [cacDoanPhuDe, setCacDoanPhuDe] = useState<SubtitleSegment[]>([]);
  const [vungOcr, setVungOcr] = useState(VUNG_OCR_MAC_DINH);
  const [dangXuLy, setDangXuLy] = useState(false);
  const [thongBao, setThongBao] = useState("Sẵn sàng nhập video đầu tiên.");
  const [dangMoCongCuXoaChu, setDangMoCongCuXoaChu] = useState(false);
  const [duongDanVideoDaXuat, setDuongDanVideoDaXuat] = useState<string>();
  const [congViecDangChay, setCongViecDangChay] = useState<ProcessingJob>();
  const [cacDuAnGanDay, setCacDuAnGanDay] = useState<VideoProject[]>([]);
  const [trangThaiOcr, setTrangThaiOcr] = useState<"NOT_STARTED" | "RUNNING" | "EMPTY" | "FAILED" | "READY">("NOT_STARTED");
  const [dangKeoVideo, setDangKeoVideo] = useState(false);
  const [coThayDoiChuaLuu, setCoThayDoiChuaLuu] = useState(false);
  const maDuAnDangMoRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    void listProjects().then(setCacDuAnGanDay).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!duAn) return;
    const boHenLuu = window.setTimeout(() => void saveProjectSettings(duAn.id, vungOcr), 700);
    return () => window.clearTimeout(boHenLuu);
  }, [duAn, vungOcr]);

  async function moDuAnGanDay(duAnGanDay: VideoProject): Promise<void> {
    if (duAnGanDay.sourceAvailable === false) {
      await lienKetLaiVideoNguon(duAnGanDay);
      return;
    }
    setDuAn(duAnGanDay);
    maDuAnDangMoRef.current = duAnGanDay.id;
    setVungOcr(duAnGanDay.ocrRegion || VUNG_OCR_MAC_DINH);
    const cacDoanDaLuu = await getProjectSegments(duAnGanDay.id);
    setCacDoanPhuDe(cacDoanDaLuu);
    setTrangThaiOcr(cacDoanDaLuu.length > 0 ? "READY" : "NOT_STARTED");
    setDuongDanVideoDaXuat(undefined);
    setThongBao("Đã mở lại dự án gần đây.");
    const cacCongViec = await listProjectJobs(duAnGanDay.id).catch(() => []);
    const congViecGanNhat = cacCongViec[0];
    if (congViecGanNhat) khoiPhucCongViecGanNhat(congViecGanNhat, duAnGanDay);
  }

  function khoiPhucCongViecGanNhat(congViec: ProcessingJob, duAnMucTieu: VideoProject): void {
    setCongViecDangChay(congViec);
    if (congViec.status === "COMPLETED" && congViec.result) {
      setDuongDanVideoDaXuat(congViec.result.outputPath);
      setThongBao(`Đã khôi phục job hoàn tất: ${congViec.result.outputPath}`);
      return;
    }
    if (congViec.status === "FAILED") {
      setThongBao(`Job gần nhất thất bại: ${congViec.error || congViec.message}`);
      return;
    }
    if (!["QUEUED", "RUNNING"].includes(congViec.status)) return;
    setDangXuLy(true);
    setThongBao("Đã nối lại công việc đang chạy từ lần mở ứng dụng trước.");
    void observeProcessingJob(congViec.id, tienDoMoi => {
      if (maDuAnDangMoRef.current !== duAnMucTieu.id) return;
      setCongViecDangChay(tienDoMoi);
      setThongBao(tienDoMoi.message);
      if (tienDoMoi.partialSegments?.length) {
        setCacDoanPhuDe(tienDoMoi.partialSegments.map(doan => ({ ...doan, projectId: duAnMucTieu.id })));
        setTrangThaiOcr("READY");
      }
    }).then(congViecCuoi => {
      if (maDuAnDangMoRef.current !== duAnMucTieu.id) return;
      setCongViecDangChay(congViecCuoi);
      if (congViecCuoi.status === "COMPLETED" && congViecCuoi.result) {
        setCacDoanPhuDe(congViecCuoi.result.segments.map(doan => ({ ...doan, projectId: duAnMucTieu.id })));
        setDuongDanVideoDaXuat(congViecCuoi.result.outputPath);
        setThongBao(`Job đã tiếp tục và xuất xong: ${congViecCuoi.result.outputPath}`);
      } else if (congViecCuoi.status === "FAILED") {
        setThongBao(congViecCuoi.error || "Job được khôi phục đã thất bại.");
      }
    }).catch(loi => setThongBao(loi instanceof Error ? loi.message : "Mất kết nối với job đang chạy."))
      .finally(() => {
        if (maDuAnDangMoRef.current === duAnMucTieu.id) setDangXuLy(false);
      });
  }

  async function lienKetLaiVideoNguon(duAnBiMatNguon: VideoProject): Promise<void> {
    if (!window.vietdubDesktop) return;
    const duongDanMoi = await window.vietdubDesktop.selectVideo();
    if (!duongDanMoi) return;
    try {
      setDangXuLy(true);
      setThongBao("Đang liên kết lại video nguồn và kiểm tra metadata…");
      const duAnDaLienKet = await relinkProjectSource(duAnBiMatNguon.id, duongDanMoi);
      await moDuAnGanDay({ ...duAnDaLienKet, sourceAvailable: true });
      setCacDuAnGanDay(cacDuAn => cacDuAn.map(duAnCu => duAnCu.id === duAnDaLienKet.id ? duAnDaLienKet : duAnCu));
      setThongBao("Đã liên kết lại video nguồn; OCR và bản dịch cũ được giữ nguyên.");
    } catch (loi) {
      setThongBao(loi instanceof Error ? loi.message : "Không thể liên kết lại video nguồn.");
    } finally {
      setDangXuLy(false);
    }
  }

  async function xuLyThayDoiChuaLuuTruocKhiDoiVideo(): Promise<boolean> {
    if (!coThayDoiChuaLuu || !window.vietdubDesktop) return true;
    const luaChon = await window.vietdubDesktop.confirmProjectReplacement();
    if (luaChon === "CANCEL") return false;
    if (luaChon === "SAVE") {
      setDangXuLy(true);
      setThongBao("Đang lưu thay đổi trước khi mở video khác…");
      await Promise.all(cacDoanPhuDe.map(doanPhuDe => saveSegment(doanPhuDe)));
      setCoThayDoiChuaLuu(false);
    }
    return true;
  }

  async function nhapVideoTuDuongDan(duongDanNguon: string): Promise<void> {
    try {
      setDangXuLy(true);
      setThongBao("Đang đọc thông tin video bằng FFprobe…");
      const duAnDaNhap = await importVideo(duongDanNguon);
      setDuAn(duAnDaNhap);
      maDuAnDangMoRef.current = duAnDaNhap.id;
      setCacDoanPhuDe([]);
      setTrangThaiOcr("NOT_STARTED");
      setDuongDanVideoDaXuat(undefined);
      setThongBao("Đã mở workspace. Hãy chạy OCR hoặc chỉnh vùng phụ đề.");
    } catch (loi) {
      setThongBao(loi instanceof Error ? loi.message : "Không thể nhập video.");
    } finally {
      setDangXuLy(false);
    }
  }

  async function khiBamNhapVideo(): Promise<void> {
    if (!window.vietdubDesktop) {
      setThongBao("Chức năng chọn video chỉ hoạt động trong ứng dụng Electron. Hãy chạy 03-chay-dev.cmd và chọn video trong cửa sổ VietDub AI Studio, không mở địa chỉ Vite bằng trình duyệt.");
      return;
    }
    const coTheDoiVideo = await xuLyThayDoiChuaLuuTruocKhiDoiVideo();
    if (!coTheDoiVideo) return;
    const duongDanNguon = await window.vietdubDesktop.selectVideo();
    if (duongDanNguon) await nhapVideoTuDuongDan(duongDanNguon);
  }

  async function khiThaVideo(suKien: React.DragEvent<HTMLElement>): Promise<void> {
    suKien.preventDefault();
    setDangKeoVideo(false);
    const tepVideo = suKien.dataTransfer.files[0];
    if (!tepVideo || !window.vietdubDesktop) {
      setThongBao("Không đọc được file vừa thả. Hãy dùng ứng dụng Electron và thử lại.");
      return;
    }
    const duongDanNguon = window.vietdubDesktop.getDroppedFilePath(tepVideo);
    const duoiTepHopLe = /\.(mp4|mkv|mov|webm)$/i.test(duongDanNguon);
    if (!duoiTepHopLe) {
      setThongBao("Chỉ hỗ trợ video MP4, MKV, MOV hoặc WebM.");
      return;
    }
    const coTheDoiVideo = await xuLyThayDoiChuaLuuTruocKhiDoiVideo();
    if (!coTheDoiVideo) return;

    await nhapVideoTuDuongDan(duongDanNguon);
  }

  async function chayOcr(): Promise<void> {
    if (!duAn) return;
    try {
      setDangXuLy(true);
      setTrangThaiOcr("RUNNING");
      setThongBao("Đang gửi vùng phụ đề đến AI Worker…");
      const cacDoanDaNhan = await runOcr(duAn.id, vungOcr);
      setCacDoanPhuDe(cacDoanDaNhan);
      setTrangThaiOcr(cacDoanDaNhan.length > 0 ? "READY" : "EMPTY");
      setThongBao("PaddleOCR đã nhận dạng video thật; hãy rà soát nội dung và độ tin cậy.");
    } catch (loi) {
      setTrangThaiOcr("FAILED");
      setThongBao(loi instanceof Error ? loi.message : "OCR không thể hoàn tất.");
    } finally {
      setDangXuLy(false);
    }
  }

  async function luuDoanPhuDe(doanPhuDe: SubtitleSegment): Promise<void> {
    try {
      await saveSegment(doanPhuDe);
      setThongBao("Đã tự động lưu đoạn phụ đề đang chỉnh sửa.");
    } catch (loi) {
      setThongBao(loi instanceof Error ? loi.message : "Không thể lưu đoạn phụ đề.");
    }
  }

  async function khoiPhucDoanDaLuu(maDoan: string): Promise<void> {
    if (!duAn) return;
    try {
      const cacDoanDaLuu = await getProjectSegments(duAn.id);
      const doanDaLuu = cacDoanDaLuu.find(doan => doan.id === maDoan);
      if (!doanDaLuu) throw new Error("Không tìm thấy phiên bản đã lưu của đoạn phụ đề.");
      setCacDoanPhuDe(cacDoan => cacDoan.map(doan => doan.id === maDoan ? doanDaLuu : doan));
      setCoThayDoiChuaLuu(false);
      setThongBao("Đã khôi phục nội dung và thời gian của đoạn từ SQLite.");
    } catch (loi) {
      setThongBao(loi instanceof Error ? loi.message : "Không thể khôi phục đoạn phụ đề.");
    }
  }

  async function chayTuDongToanBo(): Promise<void> {
    if (!duAn || dangXuLy) return;
    try {
      setDangXuLy(true);
      setThongBao("Đang kiểm tra FFmpeg, OCR, dịch và giọng Việt…");
      const dependencies = await checkDependencies();
      if (!dependencies.ready) throw new Error(`Chưa thể xử lý: thiếu ${dependencies.missing.join(", ")}.`);
      setThongBao("Đang tạo công việc xử lý nền…");
      let congViec = await createAutomaticJob(duAn.id, vungOcr);
      setCongViecDangChay(congViec);
      congViec = await observeProcessingJob(congViec.id, tienDoMoi => {
        if (maDuAnDangMoRef.current !== duAn.id) return;
        congViec = tienDoMoi;
        setCongViecDangChay(congViec);
        const tienDoPhanTram = calculateJobProgressPercent(congViec);
        const phanTram = tienDoPhanTram === undefined ? "" : ` (${tienDoPhanTram}%)`;
        setThongBao(`${congViec.message}${phanTram}`);
        if (congViec.stage === "OCR" && congViec.status === "RUNNING") setTrangThaiOcr("RUNNING");
        if (congViec.partialSegments && congViec.partialSegments.length > 0) {
          setCacDoanPhuDe(congViec.partialSegments.map(doan => ({ ...doan, projectId: duAn.id })));
          setTrangThaiOcr("READY");
        }
      });
      if (maDuAnDangMoRef.current !== duAn.id) return;
      if (congViec.status === "FAILED") throw new Error(congViec.error || "Pipeline tự động không thể hoàn tất.");
      if (congViec.status === "CANCELLED") throw new Error("Đã hủy công việc theo yêu cầu.");
      if (!congViec.result) throw new Error("Công việc hoàn tất nhưng thiếu dữ liệu kết quả.");
      setCacDoanPhuDe(congViec.result.segments.map(doan => ({ ...doan, projectId: duAn.id })));
      setTrangThaiOcr(congViec.result.segments.length > 0 ? "READY" : "EMPTY");
      setDuongDanVideoDaXuat(congViec.result.outputPath);
      setThongBao(`Đã xuất video thành công: ${congViec.result.outputPath}`);
    } catch (loi) {
      setThongBao(loi instanceof Error ? loi.message : "Pipeline tự động không thể hoàn tất.");
    } finally {
      if (maDuAnDangMoRef.current === duAn.id) setDangXuLy(false);
    }
  }

  async function huyXuLyTuDong(): Promise<void> {
    if (!congViecDangChay || congViecDangChay.status !== "RUNNING") return;
    const congViecDaYeuCauHuy = await cancelProcessingJob(congViecDangChay.id);
    setCongViecDangChay(congViecDaYeuCauHuy);
    setThongBao(congViecDaYeuCauHuy.message);
  }

  if (!duAn) {
    return <main className={`man-hinh-chao ${dangKeoVideo ? "dang-keo-video" : ""}`} onDragEnter={suKien => { suKien.preventDefault(); setDangKeoVideo(true); }} onDragOver={suKien => suKien.preventDefault()} onDragLeave={suKien => { if (suKien.currentTarget === suKien.target) setDangKeoVideo(false); }} onDrop={suKien => void khiThaVideo(suKien)}><section className="hop-nhap-video"><p className="nhan-san-pham">VIETDUB AI STUDIO</p><h1>Biên tập video Trung → Việt trong một workspace</h1><p>Nhập video để mở trình phát, bảng phụ đề và timeline đồng bộ.</p><button className="nut-chinh nut-nhap-video" onClick={() => void khiBamNhapVideo()} disabled={dangXuLy}><FolderOpen size={19} /> {dangXuLy ? "Đang nhập…" : "Mở video / Tạo dự án mới"}</button><p className="goi-y-keo-tha">hoặc kéo thả MP4, MKV, MOV, WebM vào đây</p><span>{thongBao}</span>{cacDuAnGanDay.length > 0 && <div className="du-an-gan-day"><strong>Dự án gần đây</strong>{cacDuAnGanDay.slice(0, 5).map(duAnGanDay => <button className={duAnGanDay.sourceAvailable === false ? "thieu-video-nguon" : ""} key={duAnGanDay.id} onClick={() => void moDuAnGanDay(duAnGanDay)}>{duAnGanDay.sourceAvailable === false ? "Thiếu nguồn · Liên kết lại · " : ""}{duAnGanDay.name}</button>)}</div>}<footer className="thong-tin-tac-gia">phuongdv · PM Apps Tools · 0855550200</footer></section></main>;
  }

  return <><KhongGianBienTap duAn={duAn} cacDoanPhuDe={cacDoanPhuDe} vungOcr={vungOcr} dangXuLy={dangXuLy} thongBao={thongBao} congViecDangChay={congViecDangChay} duongDanVideoDaXuat={duongDanVideoDaXuat} trangThaiOcr={trangThaiOcr} khiChayTuDong={() => void chayTuDongToanBo()} khiHuyXuLy={() => void huyXuLyTuDong()} khiDoiVideo={() => void khiBamNhapVideo()} khiChayOcr={() => void chayOcr()} khiDoiVungOcr={setVungOcr} khiCapNhatCacDoan={setCacDoanPhuDe} khiLuuDoan={luuDoanPhuDe} khiKhoiPhucDoan={maDoan => void khoiPhucDoanDaLuu(maDoan)} khiMoCongCuXoaChu={() => setDangMoCongCuXoaChu(true)} khiDoiThongBao={setThongBao} khiDoiTrangThaiChuaLuu={setCoThayDoiChuaLuu} />{dangMoCongCuXoaChu && <div className="lop-phu-cong-cu"><button className="nut-dong-cong-cu" onClick={() => setDangMoCongCuXoaChu(false)}><X size={17} /> Đóng công cụ</button><SubtitleRemovalPage project={duAn} region={vungOcr} onRegionChanged={setVungOcr} onMessageChanged={setThongBao} /></div>}</>;
}
