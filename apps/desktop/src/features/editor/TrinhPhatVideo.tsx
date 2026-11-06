import { useEffect, useState, type RefObject } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import type { SubtitleSegment, VideoProject } from "@vietdub/shared";
import { formatTime } from "../../utils/format-time";
import { generatePreviewProxy, generateVideoPoster, hasPreviewProxy } from "../../services/api";

interface ThuocTinhTrinhPhatVideo {
  duAn: VideoProject;
  doanPhuDeDangChon?: SubtitleSegment;
  thoiGianHienTaiMs: number;
  dangPhat: boolean;
  thamChieuVideo: RefObject<HTMLVideoElement | null>;
  khiThayDoiThoiGian(thoiGianMs: number): void;
  khiThayDoiTrangThaiPhat(dangPhat: boolean): void;
}

function taoDiaChiVideo(projectId: string, lanThu: number, dungProxy: boolean): string {
  // Server nội bộ trả dữ liệu theo HTTP Range để Chromium có thể phát và tua video nguồn.
  const tenRoute = dungProxy ? "preview-media" : "media";
  const diaChiServer = window.location.protocol.startsWith("http") ? "" : "http://127.0.0.1:43111";
  return `${diaChiServer}/api/projects/${encodeURIComponent(projectId)}/${tenRoute}?retry=${lanThu}`;
}

export function TrinhPhatVideo({
  duAn,
  doanPhuDeDangChon,
  thoiGianHienTaiMs,
  dangPhat,
  thamChieuVideo,
  khiThayDoiThoiGian,
  khiThayDoiTrangThaiPhat
}: ThuocTinhTrinhPhatVideo) {
  const [loiPhatVideo, setLoiPhatVideo] = useState<string>();
  const [lanThuPhat, setLanThuPhat] = useState(0);
  const [dangTaoProxy, setDangTaoProxy] = useState(false);
  const [dungProxy, setDungProxy] = useState(false);
  const [trangThaiVideo, setTrangThaiVideo] = useState<"DANG_TAI" | "SAN_SANG" | "DANG_PHAT" | "TAM_DUNG" | "LOI">("DANG_TAI");
  const [diaChiPoster, setDiaChiPoster] = useState<string>();

  useEffect(() => {
    void hasPreviewProxy(duAn.id).then(coProxy => {
      if (!coProxy) return;
      setDungProxy(true);
      setLanThuPhat(lanThu => lanThu + 1);
    });
  }, [duAn.id]);

  useEffect(() => {
    let daHuy = false;
    void generateVideoPoster(duAn.id).then(diaChi => {
      if (!daHuy) setDiaChiPoster(diaChi);
    }).catch(() => undefined);
    return () => { daHuy = true; };
  }, [duAn.id]);

  async function taoProxyXemTruoc(): Promise<void> {
    try {
      setDangTaoProxy(true);
      await generatePreviewProxy(duAn.id);
      setDungProxy(true);
      setLoiPhatVideo(undefined);
      setLanThuPhat(lanThu => lanThu + 1);
    } catch (loi) {
      setLoiPhatVideo(loi instanceof Error ? loi.message : "Không thể tạo proxy xem trước.");
    } finally {
      setDangTaoProxy(false);
    }
  }
  function batTatPhatVideo(): void {
    const video = thamChieuVideo.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }

  function diChuyenMotKhungHinh(huong: -1 | 1): void {
    const video = thamChieuVideo.current;
    if (!video) return;
    const buocGiay = 1 / Math.max(duAn.metadata.frameRate, 1);
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + buocGiay * huong));
    khiThayDoiThoiGian(Math.round(video.currentTime * 1000));
  }

  function tuaDenThoiGian(thoiGianMs: number): void {
    const video = thamChieuVideo.current;
    if (!video) return;
    video.currentTime = thoiGianMs / 1000;
    khiThayDoiThoiGian(thoiGianMs);
  }

  const nhanTrangThaiVideo = {
    DANG_TAI: "Đang tải video…",
    SAN_SANG: "Sẵn sàng phát",
    DANG_PHAT: "Đang phát",
    TAM_DUNG: "Đã tạm dừng",
    LOI: "Lỗi phát video"
  }[trangThaiVideo];

  return (
    <section className="trinh-phat-video">
      <div className="khung-video">
        <video
          ref={thamChieuVideo}
          key={lanThuPhat}
          src={taoDiaChiVideo(duAn.id, lanThuPhat, dungProxy)}
          poster={diaChiPoster}
          onLoadStart={() => setTrangThaiVideo("DANG_TAI")}
          onLoadedData={() => {
            setLoiPhatVideo(undefined);
            setTrangThaiVideo("SAN_SANG");
          }}
          onError={() => {
            setTrangThaiVideo("LOI");
            setLoiPhatVideo("Video gốc không tương thích với Chromium. Đang chuyển sang proxy xem trước…");
            if (!dungProxy && !dangTaoProxy) void taoProxyXemTruoc();
          }}
          onTimeUpdate={suKien => khiThayDoiThoiGian(Math.round(suKien.currentTarget.currentTime * 1000))}
          onPlay={() => {
            setTrangThaiVideo("DANG_PHAT");
            khiThayDoiTrangThaiPhat(true);
          }}
          onPause={() => {
            setTrangThaiVideo("TAM_DUNG");
            khiThayDoiTrangThaiPhat(false);
          }}
        />
        {trangThaiVideo === "DANG_TAI" && <div className="dang-tai-video"><span className="vong-xoay" /><strong>Đang tải video xem trước…</strong></div>}
        {loiPhatVideo && <div className="loi-phat-video"><strong>Không mở được video</strong><span>{loiPhatVideo}</span><div><button onClick={() => setLanThuPhat(lanThu => lanThu + 1)}>Thử phát lại</button><button className="nut-chinh" disabled={dangTaoProxy} onClick={() => void taoProxyXemTruoc()}>{dangTaoProxy ? "Đang tạo proxy…" : "Tạo proxy tương thích"}</button></div></div>}
        {doanPhuDeDangChon?.translatedText && (
          <div className="phu-de-xem-truoc">{doanPhuDeDangChon.translatedText}</div>
        )}
        <div className="nhan-che-do-xem">{dungProxy ? "Proxy xem trước" : "Bản gốc"}</div>
        <div className="metadata-xem-truoc">{duAn.metadata.width}×{duAn.metadata.height} · {duAn.metadata.videoCodec} · {Math.round(duAn.metadata.frameRate * 100) / 100} fps</div>
      </div>
      <div className="dieu-khien-phat">
        <button title="Lùi một khung hình" onClick={() => diChuyenMotKhungHinh(-1)}><SkipBack size={17} /></button>
        <button className="nut-phat-chinh" title="Phát hoặc tạm dừng (Space)" onClick={batTatPhatVideo}>
          {dangPhat ? <Pause size={19} /> : <Play size={19} />}
        </button>
        <button title="Tiến một khung hình" onClick={() => diChuyenMotKhungHinh(1)}><SkipForward size={17} /></button>
        <input className="thanh-tua-video" aria-label="Tua video" type="range" min="0" max={Math.max(duAn.metadata.durationMs, 1)} step="50" value={Math.min(thoiGianHienTaiMs, duAn.metadata.durationMs)} onChange={suKien => tuaDenThoiGian(Number(suKien.target.value))} />
        <span className="ma-thoi-gian">{formatTime(thoiGianHienTaiMs)} / {formatTime(duAn.metadata.durationMs)}</span>
        <span className={`trang-thai-video ${trangThaiVideo.toLowerCase()}`}>{nhanTrangThaiVideo}</span>
      </div>
    </section>
  );
}
