import type { SubtitleSegment } from "@vietvoice/shared";

export type CheDoKeoTimeline = "DI_CHUYEN" | "CAT_DAU" | "CAT_CUOI";

export function batDinhMocThoiGian(thoiGianMs: number, cacMocMs: number[], nguongMs = 120): number {
  if (cacMocMs.length === 0) return thoiGianMs;
  const mocGanNhat = cacMocMs.reduce((mocGan, moc) => Math.abs(moc - thoiGianMs) < Math.abs(mocGan - thoiGianMs) ? moc : mocGan, cacMocMs[0]);
  return Math.abs(mocGanNhat - thoiGianMs) <= nguongMs ? mocGanNhat : thoiGianMs;
}

export function tinhDoanSauKhiKeo(doanGoc: SubtitleSegment, cheDo: CheDoKeoTimeline, chenhlechMs: number, thoiLuongVideoMs: number, cacMocBatDinhMs: number[]): SubtitleSegment {
  const thoiLuongDoan = doanGoc.endMs - doanGoc.startMs;
  let startMs = doanGoc.startMs;
  let endMs = doanGoc.endMs;
  if (cheDo === "CAT_DAU") startMs = Math.min(endMs - 100, batDinhMocThoiGian(startMs + chenhlechMs, cacMocBatDinhMs));
  if (cheDo === "CAT_CUOI") endMs = Math.max(startMs + 100, batDinhMocThoiGian(endMs + chenhlechMs, cacMocBatDinhMs));
  if (cheDo === "DI_CHUYEN") {
    startMs = batDinhMocThoiGian(startMs + chenhlechMs, cacMocBatDinhMs);
    startMs = Math.max(0, Math.min(thoiLuongVideoMs - thoiLuongDoan, startMs));
    endMs = startMs + thoiLuongDoan;
  }
  return { ...doanGoc, startMs: Math.max(0, startMs), endMs: Math.min(thoiLuongVideoMs, endMs) };
}
