import type { ProcessingJob } from "@vietvoice/shared";

export function calculateJobProgressPercent(job: ProcessingJob): number | undefined {
  if (job.total <= 0) return undefined;
  const rawPercent = job.processed / job.total * 100;
  return Math.max(0, Math.min(100, Math.round(rawPercent)));
}
