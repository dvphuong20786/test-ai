import { useRef } from "react";
import type { OcrRegion } from "@vietvoice/shared";

interface SubtitleRegionSelectorProps {
  imageUrl: string;
  region: OcrRegion;
  onRegionChanged(region: OcrRegion): void;
}

type DragMode = "move" | "resize";

export function SubtitleRegionSelector({ imageUrl, region, onRegionChanged }: SubtitleRegionSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  function startDragging(event: React.PointerEvent, mode: DragMode): void {
    const container = containerRef.current;
    if (!container) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const bounds = container.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startingRegion = region;

    function onPointerMove(pointerEvent: PointerEvent): void {
      const deltaX = (pointerEvent.clientX - startX) / bounds.width;
      const deltaY = (pointerEvent.clientY - startY) / bounds.height;

      if (mode === "move") {
        const x = Math.max(0, Math.min(1 - startingRegion.width, startingRegion.x + deltaX));
        const y = Math.max(0, Math.min(1 - startingRegion.height, startingRegion.y + deltaY));
        onRegionChanged({ ...startingRegion, x, y });
        return;
      }

      const width = Math.max(0.05, Math.min(1 - startingRegion.x, startingRegion.width + deltaX));
      const height = Math.max(0.05, Math.min(1 - startingRegion.y, startingRegion.height + deltaY));
      onRegionChanged({ ...startingRegion, width, height });
    }

    function onPointerUp(): void {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  return (
    <div className="region-selector" ref={containerRef}>
      <img src={imageUrl} alt="Frame nguồn để chọn vùng phụ đề" />
      <div
        className="selected-region"
        style={{
          left: `${region.x * 100}%`,
          top: `${region.y * 100}%`,
          width: `${region.width * 100}%`,
          height: `${region.height * 100}%`
        }}
        onPointerDown={event => startDragging(event, "move")}
      >
        <span>Vùng phụ đề</span>
        <button
          className="resize-handle"
          aria-label="Đổi kích thước vùng phụ đề"
          onPointerDown={event => {
            event.stopPropagation();
            startDragging(event, "resize");
          }}
        />
      </div>
    </div>
  );
}
