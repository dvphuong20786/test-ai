import { describe, expect, it } from "vitest";
import { findFfprobePath, parseFrameRate } from "./probe-media.js";

describe("parseFrameRate", () => {
  it("đọc đúng frame rate dạng phân số của FFprobe", () => {
    expect(parseFrameRate("30000/1001")).toBeCloseTo(29.970, 3);
  });

  it("trả về 0 khi mẫu số không hợp lệ", () => {
    expect(parseFrameRate("30/0")).toBe(0);
  });

  it("ưu tiên đường dẫn FFprobe được cấu hình", () => {
    const previousPath = process.env.FFPROBE_PATH;
    process.env.FFPROBE_PATH = "D:\\CongCu\\ffprobe.exe";
    expect(findFfprobePath()).toBe("D:\\CongCu\\ffprobe.exe");
    if (previousPath === undefined) delete process.env.FFPROBE_PATH;
    else process.env.FFPROBE_PATH = previousPath;
  });
});
