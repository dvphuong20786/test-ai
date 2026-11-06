import { useEffect, useRef, useState } from "react";
import type { SubtitleSegment } from "@vietdub/shared";
import { tinhDoanSauKhiKeo, type CheDoKeoTimeline } from "../../utils/timeline-editing";

interface ThuocTinhDongThoiGian {
  thoiLuongMs: number;
  thoiGianHienTaiMs: number;
  cacDoanPhuDe: SubtitleSegment[];
  maDoanDangChon?: string;
  mucThuPhong: number;
  khiChonThoiGian(thoiGianMs: number): void;
  khiChonDoan(doanPhuDe: SubtitleSegment): void;
  khiLuuThoiGianDoan(doanPhuDe: SubtitleSegment): void;
}

interface ThaoTacKeo {
  doanGoc: SubtitleSegment;
  cheDo: CheDoKeoTimeline;
  thoiGianBatDauMs: number;
}

export function DongThoiGian({ thoiLuongMs, thoiGianHienTaiMs, cacDoanPhuDe, maDoanDangChon, mucThuPhong, khiChonThoiGian, khiChonDoan, khiLuuThoiGianDoan }: ThuocTinhDongThoiGian) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const thaoTacKeoRef = useRef<ThaoTacKeo | undefined>(undefined);
  const [doanDangXemTruoc, setDoanDangXemTruoc] = useState<SubtitleSegment>();
  const cacDoanDeVe = doanDangXemTruoc ? cacDoanPhuDe.map(doan => doan.id === doanDangXemTruoc.id ? doanDangXemTruoc : doan) : cacDoanPhuDe;
  const cacDoanBiChong = new Set<string>();
  for (let viTri = 1; viTri < cacDoanDeVe.length; viTri += 1) {
    const doanTruoc = cacDoanDeVe[viTri - 1];
    const doanSau = cacDoanDeVe[viTri];
    if (doanSau.startMs < doanTruoc.endMs) {
      cacDoanBiChong.add(doanTruoc.id);
      cacDoanBiChong.add(doanSau.id);
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const khung = canvas.parentElement;
    if (!khung) return;

    function veDongThoiGian(): void {
      if (!canvas || !khung) return;
      const tiLeDiemAnh = window.devicePixelRatio || 1;
      const chieuRongCss = Math.max(khung.clientWidth * mucThuPhong, khung.clientWidth);
      const chieuCaoCss = 154;
      canvas.style.width = `${chieuRongCss}px`;
      canvas.style.height = `${chieuCaoCss}px`;
      canvas.width = Math.round(chieuRongCss * tiLeDiemAnh);
      canvas.height = Math.round(chieuCaoCss * tiLeDiemAnh);
      const netVe = canvas.getContext("2d");
      if (!netVe) return;
      netVe.scale(tiLeDiemAnh, tiLeDiemAnh);
      netVe.fillStyle = "#0a0d16";
      netVe.fillRect(0, 0, chieuRongCss, chieuCaoCss);

      const chuyenThoiGianSangX = (thoiGianMs: number) => (thoiGianMs / Math.max(thoiLuongMs, 1)) * chieuRongCss;
      netVe.font = "11px Segoe UI";
      for (let moc = 0; moc <= 10; moc += 1) {
        const x = (moc / 10) * chieuRongCss;
        netVe.strokeStyle = "#263040";
        netVe.beginPath(); netVe.moveTo(x, 20); netVe.lineTo(x, chieuCaoCss); netVe.stroke();
        netVe.fillStyle = "#8d98aa";
        netVe.fillText(`${Math.round((thoiLuongMs / 1000) * moc / 10)}s`, x + 4, 14);
      }

      const cacTrack = [{ y: 30, ten: "VIDEO" }, { y: 61, ten: "ÂM GỐC" }, { y: 92, ten: "TRUNG" }, { y: 123, ten: "VIỆT / AI" }];
      cacTrack.forEach(track => {
        netVe.fillStyle = "#121824"; netVe.fillRect(0, track.y, chieuRongCss, 27);
        netVe.fillStyle = "#7d899c"; netVe.fillText(track.ten, 7, track.y + 18);
      });
      netVe.fillStyle = "#24344d"; netVe.fillRect(72, 33, Math.max(0, chieuRongCss - 72), 21);
      netVe.fillStyle = "#667085"; netVe.fillText("Waveform âm gốc chưa được tạo", 82, 79);

      cacDoanDeVe.forEach(doan => {
        const x = chuyenThoiGianSangX(doan.startMs);
        const rong = Math.max(3, chuyenThoiGianSangX(doan.endMs) - x);
        netVe.fillStyle = doan.id === maDoanDangChon ? "#7c5cff" : "#2d75c8";
        netVe.fillRect(x, 95, rong, 21);
        netVe.fillStyle = doan.translatedText ? "#8d55d9" : "#49385e";
        netVe.fillRect(x, 126, rong, 21);
        if (cacDoanBiChong.has(doan.id)) {
          netVe.strokeStyle = "#ff6b6b";
          netVe.lineWidth = 2;
          netVe.strokeRect(x, 94, rong, 54);
        }
      });

      const xPlayhead = chuyenThoiGianSangX(thoiGianHienTaiMs);
      netVe.strokeStyle = "#ff5277"; netVe.lineWidth = 2;
      netVe.beginPath(); netVe.moveTo(xPlayhead, 20); netVe.lineTo(xPlayhead, chieuCaoCss); netVe.stroke();
      netVe.fillStyle = "#ff5277"; netVe.beginPath(); netVe.moveTo(xPlayhead - 6, 20); netVe.lineTo(xPlayhead + 6, 20); netVe.lineTo(xPlayhead, 27); netVe.fill();
    }

    veDongThoiGian();
    const boTheoDoi = new ResizeObserver(veDongThoiGian);
    boTheoDoi.observe(khung);
    return () => boTheoDoi.disconnect();
  }, [cacDoanBiChong, cacDoanDeVe, maDoanDangChon, mucThuPhong, thoiGianHienTaiMs, thoiLuongMs]);

  function layThoiGianTuConTro(suKien: React.PointerEvent<HTMLCanvasElement>): number {
    const khungCanvas = suKien.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(thoiLuongMs, Math.round(((suKien.clientX - khungCanvas.left) / khungCanvas.width) * thoiLuongMs)));
  }

  function batDauKeo(suKien: React.PointerEvent<HTMLCanvasElement>): void {
    const thoiGianConTro = layThoiGianTuConTro(suKien);
    const khungCanvas = suKien.currentTarget.getBoundingClientRect();
    const y = suKien.clientY - khungCanvas.top;
    const doanTrung = y >= 90 ? cacDoanPhuDe.find(doan => thoiGianConTro >= doan.startMs && thoiGianConTro <= doan.endMs) : undefined;
    if (!doanTrung) {
      khiChonThoiGian(thoiGianConTro);
      return;
    }
    const nguongMepMs = Math.max(80, Math.round((8 / khungCanvas.width) * thoiLuongMs));
    const cheDo: CheDoKeoTimeline = Math.abs(thoiGianConTro - doanTrung.startMs) <= nguongMepMs ? "CAT_DAU" : Math.abs(thoiGianConTro - doanTrung.endMs) <= nguongMepMs ? "CAT_CUOI" : "DI_CHUYEN";
    thaoTacKeoRef.current = { doanGoc: doanTrung, cheDo, thoiGianBatDauMs: thoiGianConTro };
    setDoanDangXemTruoc(doanTrung);
    khiChonDoan(doanTrung);
    suKien.currentTarget.setPointerCapture(suKien.pointerId);
  }

  function layCacMocBatDinh(maDoanBoQua: string): number[] {
    const cacMoc = [0, thoiLuongMs, thoiGianHienTaiMs];
    cacDoanPhuDe.forEach(doan => {
      if (doan.id !== maDoanBoQua) cacMoc.push(doan.startMs, doan.endMs);
    });
    return cacMoc;
  }

  function xemTruocKhiKeo(suKien: React.PointerEvent<HTMLCanvasElement>): void {
    const thaoTac = thaoTacKeoRef.current;
    if (!thaoTac) return;
    const thoiGianConTro = layThoiGianTuConTro(suKien);
    const chenhlechMs = thoiGianConTro - thaoTac.thoiGianBatDauMs;
    setDoanDangXemTruoc(tinhDoanSauKhiKeo(thaoTac.doanGoc, thaoTac.cheDo, chenhlechMs, thoiLuongMs, layCacMocBatDinh(thaoTac.doanGoc.id)));
  }

  function ketThucKeo(suKien: React.PointerEvent<HTMLCanvasElement>): void {
    if (!thaoTacKeoRef.current) return;
    suKien.currentTarget.releasePointerCapture(suKien.pointerId);
    if (doanDangXemTruoc) khiLuuThoiGianDoan(doanDangXemTruoc);
    thaoTacKeoRef.current = undefined;
    setDoanDangXemTruoc(undefined);
  }

  return <div className="khung-dong-thoi-gian"><canvas ref={canvasRef} onPointerDown={batDauKeo} onPointerMove={xemTruocKhiKeo} onPointerUp={ketThucKeo} onPointerCancel={ketThucKeo} /><span className="goi-y-timeline">Kéo đoạn để di chuyển · Kéo mép để trim · Tự bắt dính trong 120 ms{cacDoanBiChong.size > 0 ? ` · Cảnh báo ${cacDoanBiChong.size} đoạn chồng nhau` : ""}</span></div>;
}
