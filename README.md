# VietVoice AI Studio

Ứng dụng desktop Windows hỗ trợ chuyển video có phụ đề tiếng Trung gắn cứng thành dự án lồng tiếng AI tiếng Việt.

## Trạng thái hiện tại

Phiên bản `v0.3.0` có workspace biên tập thống nhất và các vertical slice xử lý media:

- Electron chọn tệp video cục bộ an toàn qua preload bridge.
- Node/Express dùng FFprobe đọc metadata và Prisma/SQLite lưu project.
- React hiển thị video, cấu hình vùng OCR chuẩn hóa và trình sửa phụ đề.
- Python/FastAPI chạy PaddleOCR v5 mobile trên frame thật và gộp mẫu liền kề thành segment có timestamp.
- Nút `Xử lý tự động & xuất MP4` chạy local: OCR → Argos Trung–Anh–Việt → OpenCV inpainting → Piper giọng Việt → ASS → FFmpeg MP4.
- Màn hình “Xóa phụ đề Trung” cho phép kéo/đổi kích thước ROI, xem mask và so sánh frame trước/sau.
- AI Worker tạo mask nét chữ trong ROI và khôi phục một frame bằng OpenCV Telea hoặc Navier–Stokes.
- Engine AI inpainting là adapter chưa cài đặt, không tự tải model GPU.
- Workspace tối chuyên nghiệp giữ video, bảng phụ đề ảo hóa và timeline Canvas cùng lúc.
- Chọn subtitle sẽ seek video; chỉnh nội dung cập nhật preview, undo/redo và autosave từng dòng.

## Cấu trúc repository

Xem [PROJECT_MAP.md](./PROJECT_MAP.md) để biết vai trò từng phân hệ.

## Chạy môi trường phát triển

Yêu cầu: Node.js 22+, pnpm 10, Python 3.12, FFmpeg/FFprobe có trong `PATH`.

Hướng dẫn đầy đủ cho developer: [HUONG_DAN_TERMINAL.md](./HUONG_DAN_TERMINAL.md).

Chạy menu công cụ trên Windows:

```powershell
.\00_CONG_CU_DEV.cmd
```

```powershell
pnpm install
Copy-Item apps/server/.env.example apps/server/.env
pnpm db:generate
pnpm db:push
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r apps/ai-worker/requirements.txt
pnpm dev
```

## Kiểm tra

```powershell
pnpm build
pnpm test
```

## Giới hạn đã biết

- OCR thật, xử lý xóa phụ đề theo interval/toàn video, dịch thuật, TTS, timeline audio, ASS, xuất MP4 và Windows installer thuộc các phase tiếp theo.
- Trình duyệt phát video phụ thuộc codec mà Chromium hỗ trợ; FFprobe vẫn đọc được nhiều codec hơn.
- Không được dùng video không thuộc quyền sở hữu hoặc không có quyền chỉnh sửa/phân phối.

# powershell

Set-Location 'F:\WORK\video-ai'
.\01-kiem-tra-moi-truong.cmd
.\02-cai-dat.cmd
.\04-test.cmd
.\05-build.cmd
.\03-chay-dev.cmd

# powershell

$env:Path = 'C:\Users\dvphu\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin;' + $env:Path
.\03-chay-dev.cmd

# powershell

ffmpeg -version
ffprobe -version
node --version
pnpm --version
.\.venv\Scripts\python.exe --version

# Các địa chỉ khi chạy:

- React/Vite: http://127.0.0.1:5173
- Node API: http://127.0.0.1:43111
- FastAPI Swagger: http://127.0.0.1:43112/docs
  Checklist kiểm thử video thật 30–60 giây

1. Chuẩn bị MP4 H.264/AAC dài 30–60 giây, có phụ đề Trung Quốc đóng cứng.
2. Mở Terminal mới để nhận FFmpeg trong PATH.
3. Chạy .\01-kiem-tra-moi-truong.cmd.
4. Chạy .\04-test.cmd.
5. Chạy .\03-chay-dev.cmd.
6. Xác nhận cửa sổ Electron không tự đóng.
7. Import MP4.
8. Kiểm tra thời lượng, kích thước, FPS và codec hiển thị đúng.
9. Phát video và kiểm tra seek/timeline.
10. Chọn vùng phụ đề phía dưới video.
11. Chạy OCR.
12. Kiểm tra kết quả.
    Ở phiên bản hiện tại, bước 12 sẽ trả chuỗi 【CHẾ ĐỘ KIỂM THỬ OCR】你好，世界, không phải nội dung thật. Đây là điểm phải dừng khi đánh giá end-to-end.

Có thể tiếp tục kiểm tra riêng bản xem trước xóa phụ đề: 13. Chọn timestamp có phụ đề. 14. Điều chỉnh ROI bao quanh phụ đề. 15. Chạy inpainting preview. 16. So sánh ảnh trước/sau. 17. Thử nhiều timestamp để kiểm tra mặt người hoặc vật thể phía sau có bị làm mờ quá mức hay không.
Sau khi nhập video, bấm `Xử lý tự động & xuất MP4`. File kết quả được lưu trong thư mục `VietVoice_Output` cạnh video nguồn; nút đổi thành `Mở video đã xuất` khi hoàn tất.
