export function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  const remainder = (milliseconds % 1000).toString().padStart(3, "0");
  return `${minutes}:${seconds}.${remainder}`;
}
