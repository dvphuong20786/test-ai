import { useEffect, useState } from "react";
import { Eye, ImageMinus, Layers3, Play, RotateCcw } from "lucide-react";
import type {
  OcrRegion,
  SubtitleRemovalPreview,
  SubtitleRemovalSettings,
  VideoProject
} from "@vietdub/shared";
import { previewSubtitleRemoval } from "../../services/api";
import { SubtitleRegionSelector } from "./SubtitleRegionSelector";

interface SubtitleRemovalPageProps {
  project: VideoProject;
  region: OcrRegion;
  onRegionChanged(region: OcrRegion): void;
  onMessageChanged(message: string): void;
}

type PreviewMode = "before" | "after" | "side-by-side" | "slider" | "mask";

const defaultSettings: SubtitleRemovalSettings = {
  method: "TELEA",
  inpaintRadius: 3,
  maskDilation: 7,
  edgeFeathering: 1
};

export function SubtitleRemovalPage({
  project,
  region,
  onRegionChanged,
  onMessageChanged
}: SubtitleRemovalPageProps) {
  const [timestampMs, setTimestampMs] = useState(() => Number(localStorage.getItem(`vietdub.removalTimestamp.${project.id}`)) || 0);
  const [settings, setSettings] = useState<SubtitleRemovalSettings>(() => {
    const cauHinhDaLuu = localStorage.getItem(`vietdub.removalSettings.${project.id}`);
    if (!cauHinhDaLuu) return defaultSettings;
    try {
      return { ...defaultSettings, ...JSON.parse(cauHinhDaLuu) as SubtitleRemovalSettings };
    } catch {
      return defaultSettings;
    }
  });
  const [preview, setPreview] = useState<SubtitleRemovalPreview>();
  const [previewMode, setPreviewMode] = useState<PreviewMode>("side-by-side");
  const [isProcessing, setIsProcessing] = useState(false);
  const [comparisonPercent, setComparisonPercent] = useState(50);

  useEffect(() => {
    localStorage.setItem(`vietdub.removalSettings.${project.id}`, JSON.stringify(settings));
    localStorage.setItem(`vietdub.removalTimestamp.${project.id}`, String(timestampMs));
  }, [project.id, settings, timestampMs]);

  async function onProcessCurrentFrameClicked(): Promise<void> {
    try {
      setIsProcessing(true);
      onMessageChanged("Đang tạo mask nét chữ và khôi phục frame bằng OpenCV…");
      const removalPreview = await previewSubtitleRemoval(project.id, timestampMs, [region], settings);
      setPreview(removalPreview);
      onMessageChanged(removalPreview.warnings.length > 0
        ? removalPreview.warnings.join(" ")
        : "Đã tạo preview. Hãy so sánh kỹ trước khi xử lý video dài.");
    } catch (error) {
      onMessageChanged(error instanceof Error ? error.message : "Không thể xử lý frame hiện tại.");
    } finally {
      setIsProcessing(false);
    }
  }

  function renderPreview(): React.ReactNode {
    if (!preview) {
      return <div className="removal-empty"><ImageMinus size={40} /><p>Chọn thời điểm rồi xử lý frame để xem trước.</p></div>;
    }
    if (previewMode === "before") return <SubtitleRegionSelector imageUrl={preview.originalImage} region={region} onRegionChanged={onRegionChanged} />;
    if (previewMode === "after") return <img className="preview-image" src={preview.processedImage} alt="Frame sau khi xóa phụ đề" />;
    if (previewMode === "mask") return <img className="preview-image mask-image" src={preview.maskImage} alt="Mask xóa nét chữ" />;
    if (previewMode === "slider") return <div className="comparison-slider"><img src={preview.originalImage} alt="Frame trước xử lý" /><img className="anh-sau-so-sanh" style={{ clipPath: `inset(0 ${100 - comparisonPercent}% 0 0)` }} src={preview.processedImage} alt="Frame sau xử lý" /><span style={{ left: `${comparisonPercent}%` }} /></div>;
    return (
      <div className="comparison-grid">
        <figure><img src={preview.originalImage} alt="Trước xử lý" /><figcaption>Trước xử lý</figcaption></figure>
        <figure><img src={preview.processedImage} alt="Sau xử lý" /><figcaption>Sau xử lý</figcaption></figure>
      </div>
    );
  }

  return (
    <section className="removal-workspace">
      <div className="removal-toolbar">
        <button onClick={() => setPreviewMode("before")}><Eye size={16} /> Trước xử lý</button>
        <button onClick={() => setPreviewMode("after")}><ImageMinus size={16} /> Sau xử lý</button>
        <button onClick={() => setPreviewMode("side-by-side")}><Layers3 size={16} /> So sánh hai bên</button>
        <button onClick={() => setPreviewMode("slider")}><Layers3 size={16} /> Thanh so sánh</button>
        <button onClick={() => setPreviewMode("mask")}><Layers3 size={16} /> Xem mask</button>
      </div>

      <div className="removal-content">
        <div className="preview-stage">{renderPreview()}</div>
        <aside className="removal-settings">
          <h3>Xóa phụ đề Trung</h3>
          <label>Thời điểm frame (ms)
            <input type="number" min="0" max={project.metadata.durationMs} value={timestampMs} onChange={event => setTimestampMs(Number(event.target.value))} />
          </label>
          {previewMode === "slider" && <label>Vị trí thanh so sánh: {comparisonPercent}%<input type="range" min="0" max="100" value={comparisonPercent} onChange={event => setComparisonPercent(Number(event.target.value))} /></label>}
          <label>Phương pháp OpenCV
            <select value={settings.method} onChange={event => setSettings({ ...settings, method: event.target.value as "TELEA" | "NS" })}>
              <option value="TELEA">Telea — nhanh</option>
              <option value="NS">Navier-Stokes</option>
            </select>
          </label>
          <label>Bán kính khôi phục: {settings.inpaintRadius}
            <input type="range" min="1" max="15" value={settings.inpaintRadius} onChange={event => setSettings({ ...settings, inpaintRadius: Number(event.target.value) })} />
          </label>
          <label>Mở rộng mask: {settings.maskDilation}px
            <input type="range" min="0" max="15" value={settings.maskDilation} onChange={event => setSettings({ ...settings, maskDilation: Number(event.target.value) })} />
          </label>
          <button className="primary-button" disabled={isProcessing} onClick={onProcessCurrentFrameClicked}>
            <Play size={16} /> Xử lý frame hiện tại
          </button>
          <button className="secondary-button" onClick={() => onRegionChanged({ x: 0.08, y: 0.68, width: 0.84, height: 0.3 })}>
            <RotateCcw size={16} /> Đặt lại vùng
          </button>
          <div className="engine-status"><strong>OpenCV Fast:</strong> Sẵn sàng khi AI Worker có OpenCV.</div>
          <div className="engine-status unavailable"><strong>AI Inpainting:</strong> Chưa cài mô hình AI.</div>
          {preview && <small>Mask che phủ {(preview.maskCoverage * 100).toFixed(2)}% toàn frame · {preview.detectedBoxes.length} vùng nét chữ.</small>}
        </aside>
      </div>
    </section>
  );
}
