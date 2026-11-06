import { describe, expect, it } from "vitest";
import type { SubtitleSegment } from "@vietdub/shared";
import { batDinhMocThoiGian, tinhDoanSauKhiKeo } from "./timeline-editing";

const doanMau: SubtitleSegment = {
  id: "doan-1", projectId: "du-an-1", startMs: 1000, endMs: 2000,
  originalText: "你好", translatedText: "Xin chào", status: "TRANSLATED"
};

describe("chỉnh sửa timeline", () => {
  it("bắt dính vào mốc nằm trong ngưỡng 120 ms", () => {
    expect(batDinhMocThoiGian(1090, [500, 1000, 2000])).toBe(1000);
    expect(batDinhMocThoiGian(1300, [500, 1000, 2000])).toBe(1300);
  });

  it("di chuyển đoạn nhưng giữ thời lượng và không vượt cuối video", () => {
    const doanMoi = tinhDoanSauKhiKeo(doanMau, "DI_CHUYEN", 5000, 5000, []);
    expect(doanMoi.startMs).toBe(4000);
    expect(doanMoi.endMs).toBe(5000);
  });

  it("trim không tạo đoạn ngắn dưới 100 ms", () => {
    const doanMoi = tinhDoanSauKhiKeo(doanMau, "CAT_DAU", 990, 5000, []);
    expect(doanMoi.startMs).toBe(1900);
    expect(doanMoi.endMs).toBe(2000);
  });
});
