# Hướng dẫn cài đặt, build và chạy bằng terminal

Tài liệu này dành cho developer làm việc trên Windows với PowerShell hoặc Command Prompt.

## 1. Chạy nhanh bằng menu

Tại thư mục gốc repository:

```powershell
.\00_CONG_CU_DEV.cmd
```

Menu cung cấp các lựa chọn cài đặt, chạy development, build, test, làm sạch và mở Prisma Studio.

## 2. Thứ tự file an toàn

Chạy theo đúng thứ tự sau:

| Bước | File | Khi nào chạy |
|---:|---|---|
| 00 | `00_CONG_CU_DEV.cmd` | Cách khuyến nghị: mở menu và chọn tác vụ |
| 01 | `01-kiem-tra-moi-truong.cmd` | Kiểm tra máy trước khi cài hoặc chạy |
| 02 | `02-cai-dat.cmd` | Chạy lần đầu hoặc khi dependency thay đổi |
| 03 | `03-chay-dev.cmd` | Chạy ứng dụng để lập trình hằng ngày |
| 04 | `04-test.cmd` | Kiểm tra code trước khi bàn giao |
| 05 | `05-build.cmd` | Build sau khi test đạt |
| 06 | `06-mo-database.cmd` | Tùy chọn, chỉ khi cần xem SQLite |
| 90 | `90-lam-sach.cmd` | Chỉ khi cần xóa build/cache và tạo lại |

File có tiền tố `_NOI_BO_` chỉ được các script khác gọi, developer không cần chạy trực tiếp.

## 3. Yêu cầu môi trường

Kiểm tra các công cụ:

```powershell
node --version
pnpm --version
py -3.12 --version
ffmpeg -version
ffprobe -version
```

Phiên bản khuyến nghị:

- Node.js 22 trở lên.
- pnpm 10.
- Python 3.12.
- FFmpeg và FFprobe có trong biến môi trường `PATH`.

## 4. Cài đặt tự động — bước 02

```powershell
.\02-cai-dat.cmd
```

Script thực hiện theo thứ tự:

1. Kiểm tra Node.js, pnpm và Python 3.12.
2. Chạy `pnpm install`.
3. Tạo môi trường Python `.venv` nếu chưa có.
4. Cài dependency AI Worker từ `apps/ai-worker/requirements.txt`.
5. Tạo `apps/server/.env` từ file mẫu nếu chưa có.
6. Generate Prisma Client và đồng bộ schema SQLite.

## 5. Chạy môi trường development — bước 03

```powershell
.\03-chay-dev.cmd
```

Hoặc chạy thủ công:

```powershell
pnpm dev
```

Các địa chỉ được in trên terminal:

| Thành phần | Địa chỉ |
|---|---|
| React/Vite | [http://localhost:5173](http://localhost:5173) |
| Backend health | [http://127.0.0.1:43111/health](http://127.0.0.1:43111/health) |
| AI Worker health | [http://127.0.0.1:43112/health](http://127.0.0.1:43112/health) |
| AI Worker Swagger | [http://127.0.0.1:43112/docs](http://127.0.0.1:43112/docs) |

Electron tự mở cửa sổ ứng dụng. Nhấn `Ctrl+C` tại terminal để dừng toàn bộ tiến trình development.

## 6. Chạy test — bước 04

```powershell
.\04-test.cmd
```

Hoặc:

```powershell
pnpm test
```

Lệnh chạy Vitest của desktop/server và Python unittest của AI Worker bằng `.venv`.

## 7. Build production — bước 05

```powershell
.\05-build.cmd
```

Hoặc:

```powershell
pnpm build
```

Build hiện tạo bundle React/Electron và JavaScript server. Đây chưa phải Windows installer hoàn chỉnh.

## 8. Mở database — bước 06, tùy chọn

```powershell
.\06-mo-database.cmd
```

Địa chỉ mặc định: [http://localhost:5555](http://localhost:5555).

Nhấn `Ctrl+C` để dừng Prisma Studio.

## 9. Làm sạch — bước 90, chỉ chạy khi cần

```powershell
.\90-lam-sach.cmd
```

Script yêu cầu nhập chính xác `XOA` trước khi thực hiện.

Script chỉ xóa các đầu ra có thể tạo lại:

- `apps/desktop/dist`
- `apps/desktop/dist-electron`
- `apps/server/dist`
- `.vite` và cache Python
- Các file `tsbuildinfo` do project desktop tạo ra

Script không xóa source code, `node_modules`, `.venv`, file `.env` hoặc database SQLite.

## 10. Các lệnh riêng lẻ thường dùng

```powershell
# Generate Prisma Client
pnpm db:generate

# Đồng bộ schema vào SQLite development
pnpm db:push

# Chỉ chạy backend
pnpm --filter @vietvoice/server dev

# Chỉ chạy AI Worker
pnpm worker:dev

# Chỉ chạy Electron/React
pnpm --filter @vietvoice/desktop dev

# Kiểm tra thay đổi Git
git status --short
git diff --check
```

## 11. Xử lý lỗi thường gặp

### Không tìm thấy FFmpeg hoặc FFprobe

Cài FFmpeg, thêm thư mục `bin` vào `PATH`, đóng terminal cũ rồi mở terminal mới.

```powershell
where.exe ffmpeg
where.exe ffprobe
```

### Cổng đang được sử dụng

```powershell
Get-NetTCPConnection -LocalPort 5173,43111,43112,5555 -ErrorAction SilentlyContinue
```

Đóng tiến trình development cũ trước khi chạy lại. Không kết thúc tiến trình nếu chưa xác định đúng ứng dụng sở hữu cổng.

### Python dependency bị lỗi

```powershell
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r apps/ai-worker/requirements.txt
```
