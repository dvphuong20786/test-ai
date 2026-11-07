// Chạy một lệnh Python bằng python của .venv nếu có, ngược lại dùng python hệ thống.
// Dùng chung cho cả Windows (.venv\Scripts\python.exe) và Linux/macOS
// (.venv/bin/python) để script "test" và "worker:dev" trong package.json
// không còn hardcode đường dẫn Windows.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const thuMucGoc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacUngVien = [
  path.join(thuMucGoc, ".venv", "Scripts", "python.exe"),
  path.join(thuMucGoc, ".venv", "bin", "python"),
  "python",
  "python3",
];
const lenh = process.argv.slice(2);
if (lenh.length === 0) {
  console.error("Cách dùng: node scripts/chay-python.mjs <lệnh python...>");
  process.exit(2);
}
// Thử lần lượt từng ứng viên: đường dẫn tuyệt đối phải tồn tại, tên lệnh
// (python/python3) phải chạy được thật, nếu không thì thử ứng viên tiếp theo.
let ketQua = null;
for (const ungVien of cacUngVien) {
  if (path.isAbsolute(ungVien) && !existsSync(ungVien)) continue;
  ketQua = spawnSync(ungVien, lenh, {
    stdio: "inherit",
    env: { ...process.env, PYTHONPATH: path.join(thuMucGoc, "apps", "ai-worker") },
  });
  if (ketQua.error?.code !== "ENOENT") break;
}
if (!ketQua || ketQua.error) {
  console.error("Không tìm thấy python để chạy. Hãy tạo .venv hoặc cài Python 3.12 vào PATH.");
  process.exit(1);
}
process.exit(ketQua.status ?? 1);
