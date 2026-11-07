import { describe, expect, it } from "vitest";
import type { ProcessingJob } from "@vietvoice/shared";
import { calculateJobProgressPercent } from "./job-progress";

function createJob(processed: number, total: number): ProcessingJob {
  return {
    id: "job-test", projectId: "project-test", status: "RUNNING", stage: "OCR",
    processed, total, message: "Đang OCR", updatedAt: new Date(0).toISOString()
  };
}

describe("calculateJobProgressPercent", () => {
  it("không dựng phần trăm khi chưa biết tổng số", () => {
    expect(calculateJobProgressPercent(createJob(0, 0))).toBeUndefined();
  });

  it("tính phần trăm từ đơn vị xử lý thật và giới hạn 0-100", () => {
    expect(calculateJobProgressPercent(createJob(37, 88))).toBe(42);
    expect(calculateJobProgressPercent(createJob(120, 100))).toBe(100);
  });
});
