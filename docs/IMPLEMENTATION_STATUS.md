# Trạng thái triển khai

## Đã hoạt động trong mã nguồn

- Luồng chọn video bằng Electron IPC giới hạn.
- Gọi FFprobe không qua shell string.
- Lưu project và segment bằng Prisma/SQLite.
- ROI chuẩn hóa và validation ở cả Node lẫn Python.
- Sửa và lưu nội dung phụ đề.
- Gộp mẫu OCR giống nhau chỉ khi liền kề theo thời gian.
- Chọn ROI tương tác bằng kéo/resize trên frame preview.
- Sinh mask nét chữ cục bộ, dilation, feathering và OpenCV inpainting cho một frame.
- Preview trước/sau/mask, quality warning và adapter AI inpainting chưa cài model.
- Workspace biên tập thống nhất với 5 mode, video player, bảng phụ đề ảo hóa và timeline Canvas.
- Đồng bộ chọn subtitle/clip với video seek, playhead theo video, sửa inline, undo/redo và autosave từng segment.
- PaddleOCR v5 mobile chạy trên frame thật, dịch offline Argos, TTS Piper và export FFmpeg.
- Job nền có stage/progress thật qua SSE, hủy, retry, snapshot recovery và trung tâm xử lý.
- Media HTTP Range, proxy VP8/Opus cho codec không tương thích và danh sách dự án gần đây.
- Tách/gộp segment, empty state OCR, phím tắt và panel resize có persistence.
- Thanh tua video và trạng thái tải/phát/lỗi nhìn thấy trực tiếp trong workspace.
- Kéo-thả video ở màn hình chào, chặn pipeline trùng cùng dự án và error boundary toàn ứng dụng.

## Đã kiểm thử end-to-end

- Pipeline local đã xuất video WebM 87.624 giây thành MP4 H.264/AAC với 61 segment.
- Progress OCR và inpainting lấy từ số mẫu/frame thật, không dùng timer giả.
- Chất lượng xóa chữ lượt đầu chưa đạt hoàn toàn; cấu hình vùng/mask đã tăng cường và còn cần kiểm tra lại.

## Chưa triển khai

- Trích frame thích ứng theo thay đổi cảnh.
- Xử lý interval/toàn video theo chunk và temporal mask tracking xuyên job.
- Glossary và cache dịch.
- Căn chỉnh tốc độ/độ dài TTS nâng cao.
- Waveform thật, drag/trim clip và snapping timeline.
- Lịch sử nhiều job với nhật ký kỹ thuật đầy đủ và retry riêng từng stage.
- First-run wizard và đóng gói Windows hoàn chỉnh.

## Kiểm tra Phase 2

- Video tổng hợp có đường dẫn Unicode được OpenCV đọc và xử lý thành công.
- 9 Python unittest đạt, gồm ROI, inpaint, temporal IoU, pipeline preview, job stage/persistence/cancel/chặn trùng.
- FastAPI health smoke test đạt.
