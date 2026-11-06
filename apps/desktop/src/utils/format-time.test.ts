import { describe, expect, it } from "vitest";
import { formatTime } from "./format-time";

describe("formatTime", () => {
  it("hiển thị millisecond theo định dạng phút:giây", () => {
    expect(formatTime(65_042)).toBe("01:05.042");
  });
});
