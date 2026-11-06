import { useMemo, useRef, useState } from "react";
import { Merge, Play, RotateCcw, Scissors, Search, Volume2 } from "lucide-react";
import type { SubtitleSegment } from "@vietdub/shared";
import { formatTime } from "../../utils/format-time";

interface ThuocTinhBangPhuDe {
  cacDoanPhuDe: SubtitleSegment[];
  maDoanDangChon?: string;
  khiChonDoan(doanPhuDe: SubtitleSegment): void;
  khiSuaNoiDung(maDoan: string, truong: "originalText" | "translatedText", noiDung: string): void;
  khiTachDoan(): void;
  khiGopDoanTiepTheo(): void;
  khiXemThuDoan(): void;
  khiTaoLaiGiong(): void;
  khiKhoiPhucDoan(): void;
  trangThaiOcr: "NOT_STARTED" | "RUNNING" | "EMPTY" | "FAILED" | "READY";
  khiThuLaiOcr(): void;
}

const CHIEU_CAO_DONG = 58;
const SO_DONG_DEM = 4;

export function BangPhuDe({ cacDoanPhuDe, maDoanDangChon, khiChonDoan, khiSuaNoiDung, khiTachDoan, khiGopDoanTiepTheo, khiXemThuDoan, khiTaoLaiGiong, khiKhoiPhucDoan, trangThaiOcr, khiThuLaiOcr }: ThuocTinhBangPhuDe) {
  const [tuKhoa, setTuKhoa] = useState("");
  const [viTriCuon, setViTriCuon] = useState(0);
  const [chiHienLoi, setChiHienLoi] = useState(false);
  const [thuTu, setThuTu] = useState<"TANG" | "GIAM">("TANG");
  const khungCuonRef = useRef<HTMLDivElement>(null);

  const cacDoanDaLoc = useMemo(() => {
    const tuKhoaChuan = tuKhoa.trim().toLocaleLowerCase("vi");
    const cacDoanKhopTuKhoa = cacDoanPhuDe.filter(doan => !tuKhoaChuan
      || doan.originalText.toLocaleLowerCase().includes(tuKhoaChuan)
      || doan.translatedText.toLocaleLowerCase("vi").includes(tuKhoaChuan));
    const cacDoanKhopTrangThai = chiHienLoi
      ? cacDoanKhopTuKhoa.filter(doan => (doan.ocrConfidence || 0) < .7 || !doan.translatedText.trim() || doan.status === "NEEDS_REVIEW")
      : cacDoanKhopTuKhoa;
    return [...cacDoanKhopTrangThai].sort((doanA, doanB) => thuTu === "TANG" ? doanA.startMs - doanB.startMs : doanB.startMs - doanA.startMs);
  }, [cacDoanPhuDe, chiHienLoi, thuTu, tuKhoa]);

  const chieuCaoKhung = khungCuonRef.current?.clientHeight || 480;
  const chiSoDau = Math.max(0, Math.floor(viTriCuon / CHIEU_CAO_DONG) - SO_DONG_DEM);
  const soDongCanVe = Math.ceil(chieuCaoKhung / CHIEU_CAO_DONG) + SO_DONG_DEM * 2;
  const cacDoanDangHienThi = cacDoanDaLoc.slice(chiSoDau, chiSoDau + soDongCanVe);

  return (
    <section className="bang-phu-de">
      <div className="thanh-tim-kiem">
        <Search size={16} />
        <input aria-label="Tìm phụ đề" value={tuKhoa} onChange={suKien => setTuKhoa(suKien.target.value)} placeholder="Tìm tiếng Trung hoặc tiếng Việt…" />
        <span>{cacDoanDaLoc.length} đoạn</span>
      </div>
      <div className="thanh-loc-phu-de"><label><input type="checkbox" checked={chiHienLoi} onChange={suKien => setChiHienLoi(suKien.target.checked)} /> Chỉ hiện lỗi</label><select aria-label="Sắp xếp phụ đề" value={thuTu} onChange={suKien => setThuTu(suKien.target.value as "TANG" | "GIAM")}><option value="TANG">Thời gian tăng</option><option value="GIAM">Thời gian giảm</option></select></div>
      <div className="thanh-sua-doan"><button disabled={!maDoanDangChon} onClick={khiXemThuDoan}><Play size={14} /> Xem câu</button><button disabled={!maDoanDangChon} onClick={khiTaoLaiGiong}><Volume2 size={14} /> Tạo lại giọng</button><button disabled={!maDoanDangChon} onClick={khiKhoiPhucDoan}><RotateCcw size={14} /> Khôi phục</button><button disabled={!maDoanDangChon} onClick={khiTachDoan}><Scissors size={14} /> Tách</button><button disabled={!maDoanDangChon} onClick={khiGopDoanTiepTheo}><Merge size={14} /> Gộp</button></div>
      <div className="tieu-de-bang-phu-de">
        <span>#</span><span>Thời gian</span><span>Tiếng Trung</span><span>Tiếng Việt</span><span>OCR</span>
      </div>
      <div className="khung-cuon-phu-de" ref={khungCuonRef} onScroll={suKien => setViTriCuon(suKien.currentTarget.scrollTop)}>
        {cacDoanDaLoc.length === 0 && <div className="trang-thai-trong-phu-de">
          {trangThaiOcr === "NOT_STARTED" && <><strong>Chưa nhận diện phụ đề</strong><span>Hãy chọn vùng chữ Trung và chạy OCR.</span><button onClick={khiThuLaiOcr}>Chạy OCR</button></>}
          {trangThaiOcr === "RUNNING" && <><strong>Đang nhận diện phụ đề…</strong><span>Các câu tìm thấy sẽ xuất hiện tại đây.</span></>}
          {trangThaiOcr === "EMPTY" && <><strong>Không tìm thấy phụ đề Trung</strong><span>Hãy kiểm tra vùng nhận diện, chất lượng video hoặc thử lại OCR.</span><button onClick={khiThuLaiOcr}>Thử lại OCR</button></>}
          {trangThaiOcr === "FAILED" && <><strong>Nhận diện phụ đề thất bại</strong><span>Xem chi tiết lỗi ở Trung tâm xử lý hoặc thử lại.</span><button onClick={khiThuLaiOcr}>Thử lại OCR</button></>}
        </div>}
        <div className="chieu-cao-ao" style={{ height: cacDoanDaLoc.length * CHIEU_CAO_DONG }}>
          <div style={{ transform: `translateY(${chiSoDau * CHIEU_CAO_DONG}px)` }}>
            {cacDoanDangHienThi.map((doan, viTri) => {
              const chiSoThuc = chiSoDau + viTri;
              return (
                <div
                  className={`dong-phu-de ${maDoanDangChon === doan.id ? "dang-chon" : ""}`}
                  key={doan.id}
                  style={{ height: CHIEU_CAO_DONG }}
                  onClick={() => khiChonDoan(doan)}
                >
                  <span>{chiSoThuc + 1}</span>
                  <span className="thoi-gian-doan">{formatTime(doan.startMs)}<br />{formatTime(doan.endMs)}</span>
                  <input value={doan.originalText} onChange={suKien => khiSuaNoiDung(doan.id, "originalText", suKien.target.value)} onClick={suKien => suKien.stopPropagation()} />
                  <input value={doan.translatedText} placeholder="Chưa dịch" onChange={suKien => khiSuaNoiDung(doan.id, "translatedText", suKien.target.value)} onClick={suKien => suKien.stopPropagation()} />
                  <span className={(doan.ocrConfidence || 0) < .7 ? "canh-bao" : ""}>{Math.round((doan.ocrConfidence || 0) * 100)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
