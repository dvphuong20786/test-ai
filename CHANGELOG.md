# CHANGELOG — VietVoice AI Studio

Lịch sử thay đổi tuân theo Semantic Versioning.

## [v0.5.0] - 2026-11-03
- **Yêu cầu**: Tiếp tục task dài, sửa video xem trước bị đen và lỗi `fetch failed` khi chạy xử lý tự động.
- **Chi tiết kỹ thuật**:
 - Thay nguồn phát `file:///` bị Chromium chặn bằng API media nội bộ hỗ trợ HTTP Range, seek và đúng MIME cho MP4/WebM/MOV/MKV.
 - Thêm công việc pipeline chạy nền trên AI Worker, trạng thái theo từng giai đoạn và tiến độ thật dựa trên số mẫu OCR/số frame inpainting.
 - Giao diện tạo job rồi theo dõi định kỳ; lỗi kết nối hiện địa chỉ server và chi tiết thay vì chỉ báo `fetch failed`.
 - Thêm danh sách dự án gần đây để mở lại video đã nhập mà không phải chọn file lại.
 - Thêm module `job_manager.py` quản lý vòng đời job trong tiến trình worker.
 - Chuyển theo dõi tiến độ sang Server-Sent Events; bổ sung hủy an toàn, thử lại và trung tâm xử lý hiển thị stage/status/lỗi.
 - Lưu job ra `data/jobs` theo kiểu ghi file tạm rồi thay thế; job bị gián đoạn do worker khởi động lại được đánh dấu lỗi có thể thử lại.
 - Thêm mở lại segment của dự án gần đây, đổi video nguồn, trạng thái lỗi phát video và nút thử phát lại.
 - Thêm thao tác tách đoạn tại playhead và gộp đoạn kế tiếp, lưu transaction trong SQLite.
 - Thêm proxy xem trước VP8/Opus, endpoint Range cho proxy và Vite same-origin proxy để xử lý codec nguồn không tương thích Chromium.
 - Thêm empty state theo trạng thái OCR, Ctrl+O/Ctrl+F, autosave vùng OCR/segment đang chọn và panel trái/phải kéo-resize có persistence.
 - Thêm preflight dependency cho FFmpeg, Argos và Piper trước khi tạo full-pipeline job.
 - Mở rộng vùng inpainting xuống đáy frame, tăng dilation/radius sau khi kiểm tra frame thật cho thấy chữ nguồn còn lộ.
 - Bổ sung thanh tua trực tiếp dưới video và trạng thái tải/sẵn sàng/đang phát/tạm dừng/lỗi để người dùng biết rõ nút phát có hoạt động hay không.
 - Ngăn tạo hai pipeline đồng thời cho cùng một dự án; lần bấm lặp lại tiếp tục theo dõi công việc đang chạy thay vì tranh chấp tài nguyên.
 - Thêm kéo-thả video MP4/MKV/MOV/WebM vào màn hình chào, dùng `webUtils.getPathForFile` an toàn qua preload Electron.
 - Thêm error boundary toàn ứng dụng: giữ dữ liệu đã autosave, hiển thị lỗi có thể đọc và nút tải lại thay vì màn hình trắng.
 - Thêm xác nhận Lưu/Bỏ thay đổi/Hủy khi mở video khác lúc còn chỉnh sửa chưa lưu; mở video mới tạo project riêng nên OCR/bản dịch dự án cũ không bị xóa.
 - Kiểm tra file nguồn của dự án gần đây, đánh dấu dự án bị mất media và cho liên kết lại đường dẫn mà vẫn giữ segment cũ.
 - Hiển thị đường dẫn đầy đủ, thời lượng, độ phân giải và codec trong panel thông tin video nguồn.
 - Thêm hộp xác nhận cấu hình pipeline trước khi chạy, nêu rõ video, vùng OCR, dịch, giọng, inpainting và định dạng đầu ra.
 - Mở rộng job với thời điểm bắt đầu, thời lượng, các stage đã xong và nhật ký kỹ thuật; TTS báo tiến độ thật theo từng câu và video đầu ra có bước validation.
 - Timeline cho phép kéo đoạn, trim mép đầu/cuối, bắt dính playhead/đoạn lân cận trong 120 ms, cảnh báo chồng đoạn và lưu timestamp vào SQLite.
 - Bỏ thanh âm thanh giả; timeline nói rõ waveform nguồn chưa được tạo thay vì trình bày dữ liệu mô phỏng.
 - Thêm test hàm thuần cho snapping, giới hạn cuối video và thời lượng trim tối thiểu trên timeline.
 - Bổ sung lọc đoạn lỗi, sắp xếp timeline, xem câu hiện tại, khôi phục bản SQLite và tạo lại/phát thử giọng Piper cho riêng câu đã sửa.
 - Lưu voice ID, đường dẫn WAV và thời lượng audio theo segment trong SQLite để không mất khi khởi động lại.
 - Tạo poster từ timestamp hợp lệ bằng OpenCV, hiển thị spinner khi video đang tải và metadata độ phân giải/codec/FPS ngay trên preview.
 - Chuẩn hóa lỗi thiếu file, hết dung lượng, AI Worker mất kết nối và PaddleOCR khởi tạo thất bại thành hướng dẫn tiếng Việt kèm mã, thao tác và timestamp chẩn đoán an toàn.
 - Lưu riêng cấu hình xóa chữ và timestamp preview theo từng project để khôi phục sau khi đóng/mở ứng dụng.
 - Sửa import video trên Windows: Node Server tự tìm `ffprobe.exe` trong gói FFmpeg WinGet thay vì phụ thuộc PATH của terminal.
 - Lưu segment trung gian ngay sau OCR và dịch vào snapshot job/SQLite; giao diện có thể rà soát kết quả đã xong ngay cả khi inpainting, TTS hoặc export về sau thất bại.
 - Sửa mask inpainting sau kiểm tra frame thật: chỉ giữ connected component có hình học giống chữ, loại mảng sáng lớn, không mở rộng ROI lên thân người và giảm dilation/radius để tránh phá nền.
 - Thêm API lịch sử job theo project để giao diện có thể khôi phục tiến độ/kết quả sau khi ứng dụng hoặc màn hình được mở lại.
 - Khi mở dự án gần đây, tự hiển thị job cuối; nếu còn chạy thì nối lại SSE, nếu hoàn tất thì khôi phục nút mở MP4, nếu lỗi thì hiển thị nguyên nhân và retry.
 - Job của project cũ tiếp tục chạy nền nhưng không được phép ghi đè state giao diện sau khi người dùng đã chuyển sang project khác.
 - Công cụ xóa chữ có thêm thanh so sánh kéo được giữa frame gốc và frame đã inpaint, bên cạnh chế độ trước/sau/hai bên/mask.
 - Trung tâm xử lý có nút đóng/ẩn riêng không hủy job; hành động hủy vẫn là nút độc lập ở toolbar.
- **Lưu ý kỹ thuật & chưa kiểm thử**:
 - Đã xác nhận API media của video WebM 87,624 giây trả `206 Partial Content`, `video/webm` và đúng `Content-Range`.
 - Build server/desktop và 6 Python unittest đạt; job WebM thật đã chuyển sang `RUNNING/OCR` với tiến độ 24/117 khi kiểm tra.
 - Job WebM dài vẫn đang được kiểm thử end-to-end; các phần resize panel, danh sách lịch sử job đầy đủ và kiểm thử UI tự động vẫn tiếp tục trong task dài.
 - Đã hoàn tất video WebM 87.624 giây: 61 segment, MP4 H.264 1920×1080, AAC stereo 48 kHz, 87.554 giây, 52,959,369 byte.
 - Frame giây 40 của lượt đầu còn chữ nguồn bên dưới phụ đề Việt; cấu hình inpainting đã được tăng cường nhưng cần chạy/kiểm tra lại trước khi coi chất lượng xóa chữ đạt.
 - Lượt kiểm thử lại video ngắn dừng ở bước chuẩn bị vì file nguồn thử nghiệm đã bị xóa; đây là lỗi dữ liệu đầu vào, không phải lỗi OCR/FFmpeg.
 - Test hiện có: 3 Vitest desktop, 2 Vitest server và 8 Python unittest đạt; build desktop/server đạt.

## [v0.4.0] - 2026-11-03
- **Yêu cầu**: Bắt đầu task dài Bước 1 để xử lý tự động từ video nguồn đến MP4 đầu ra thật.
- **Chi tiết kỹ thuật**:
 - Cài PaddlePaddle, PaddleOCR, thư viện dịch và Edge TTS vào môi trường Python của dự án; khóa phiên bản trong `requirements.txt`.
 - Thay OCR giả lập bằng PaddleOCR v5 mobile chạy thật trên vùng phụ đề của các frame lấy mẫu mỗi 750 ms.
 - Gộp các frame có cùng nội dung thành đoạn phụ đề có timestamp và độ tin cậy thực tế.
 - Tắt MKL-DNN riêng cho OCR để tránh lỗi oneDNN của PaddlePaddle 3.3.1 trên Windows.
 - Thêm pipeline một nút chạy dịch offline Argos Trung → Anh → Việt, inpainting OpenCV toàn video, giọng Việt Piper và đóng phụ đề ASS bằng FFmpeg.
 - Thêm API Node/FastAPI cho pipeline tự động, lưu segment kết quả và trả đường dẫn MP4.
 - Thêm nút `Xử lý tự động & xuất MP4`; sau khi hoàn tất đổi thành `Mở video đã xuất` để mở file trong Explorer.
- **Lưu ý kỹ thuật & chưa kiểm thử**:
 - Đã kiểm thử end-to-end trực tiếp và qua Node API với video mẫu 25 giây; kết quả có 5 segment dịch, H.264 960×540, AAC mono 48 kHz và thời lượng 25 giây.
 - Đã giải mã và kiểm tra trực quan frame giây thứ 3: chữ Trung được inpaint và phụ đề Việt `Xin chào. Chào mừng đến đây.` được đóng vào video; vùng inpainting vẫn có thể còn vệt tối và cần cải thiện chất lượng ở bước sau.

## [v0.3.3] - 2026-11-03
- **Yêu cầu**: Chỉnh giao diện workspace để người dùng dễ nhìn và thao tác theo đúng thứ tự các bước sau khi chọn video.
- **Chi tiết kỹ thuật**:
 - Đánh số 5 giai đoạn trên thanh điều hướng và hiển thị trạng thái thực tế của từng giai đoạn.
 - Thêm thanh hướng dẫn “việc cần làm tiếp theo” dựa trên việc đã có hay chưa có dữ liệu OCR.
 - Viết lại bảng công cụ OCR thành checklist 4 thao tác; đổi nhãn `x/y/width/height` sang tiếng Việt và đưa thiết lập vùng vào mục có thể thu gọn.
 - Gắn cảnh báo trực tiếp rằng OCR đang trả dữ liệu mẫu để tránh nhầm với nhận dạng thật.
- **Lưu ý kỹ thuật & chưa kiểm thử**:
 - Không thay đổi backend hoặc bổ sung tính năng xử lý video.
 - Toàn bộ 3 Vitest, 6 Python unittest và hai lượt build TypeScript/Vite sau chỉnh sửa đều đạt; đã xác nhận nội dung hướng dẫn mới hiển thị trong cửa sổ Electron đang chạy.

## [v0.3.2] - 2026-11-03
- **Yêu cầu**: Sửa lỗi cửa sổ Electron không mở được hộp thoại chọn video nguồn.
- **Chi tiết kỹ thuật**:
 - Chuyển preload bridge từ `preload.ts` sinh ES Module sang `preload.cts` sinh CommonJS để tương thích với cách Electron nạp preload trong chế độ sandbox.
 - Cập nhật `main.ts` nạp đúng `preload.cjs` và mở rộng cấu hình TypeScript để biên dịch file `.cts`.
 - Cập nhật `PROJECT_MAP.md` theo tên file và định dạng preload mới.
- **Lưu ý kỹ thuật & chưa kiểm thử**:
 - Đã xác nhận build sinh đúng `dist-electron/preload.cjs` với lệnh `require("electron")`; toàn bộ 3 Vitest, 6 Python unittest và build TypeScript/Vite đều đạt.
 - Cần đóng cửa sổ Electron cũ và chạy lại `03-chay-dev.cmd` để tiến trình mới nạp preload đã sửa.

## [v0.3.1] - 2026-11-03
- **Yêu cầu**: Thêm thông tin tác giả và làm rõ lỗi nút chọn video nguồn không phản hồi.
- **Chi tiết kỹ thuật**:
 - Hiển thị `phuongdv · PM Apps Tools · 0855550200` trên màn hình chào và bổ sung metadata tác giả cho package gốc cùng ứng dụng desktop.
 - Lưu thông tin tác giả mặc định vào `AGENTS.md` để các lượt phát triển sau tiếp tục sử dụng thống nhất.
 - Thay việc bỏ qua âm thầm khi thiếu preload bridge bằng thông báo rõ rằng chọn file chỉ hoạt động trong cửa sổ Electron được mở từ `03-chay-dev.cmd`, không hoạt động khi mở riêng URL Vite trong trình duyệt.
- **Lưu ý kỹ thuật & chưa kiểm thử**:
 - Toàn bộ 3 Vitest, 6 Python unittest và build TypeScript/Vite đã đạt; cửa sổ Electron khởi động thành công.
 - Môi trường tự động không chụp được nội dung cửa sổ Electron để thao tác hộp thoại native; cần bấm nút một lần trên cửa sổ desktop thật để xác nhận trực quan.

## [v0.3.0] - 2026-11-03
- **Yêu cầu**: Xây dựng professional unified video editor UI/UX, bắt đầu bằng vertical slice Video Player + Subtitle Editor + Timeline đồng bộ.
- **Chi tiết kỹ thuật**:
 - Thay giao diện rời rạc bằng workspace docked tối gồm top bar, 5 mode, tools panel thu gọn, video trung tâm, bảng phụ đề bên phải và timeline phía dưới.
 - Thêm `TrinhPhatVideo` với play/pause, frame step, playback clock và phụ đề Việt overlay theo dòng đang chọn.
 - Thêm `BangPhuDe` ảo hóa theo vùng nhìn thấy, tìm kiếm Trung/Việt, sửa inline và cảnh báo OCR thấp.
 - Thêm `DongThoiGian` dùng Canvas cho ruler, track video/audio/phụ đề và playhead; click timeline seek video và chọn segment tương ứng.
 - Thêm undo/redo, autosave từng segment sau 900ms, invalidate audio của dòng dịch bị sửa và shortcut Space/Ctrl+S/Ctrl+Z/Ctrl+Y/Ctrl+E/Alt+Arrow.
 - Giữ công cụ xóa phụ đề OpenCV hiện có qua lớp công cụ chi tiết trong workspace.
- **Lưu ý kỹ thuật & chưa kiểm thử**:
 - Build TypeScript/Vite và toàn bộ 3 Vitest + 6 Python unittest đã đạt; waveform thật, drag/trim clip, resize panel persistence, TTS và export MP4 vẫn chưa có backend hoàn chỉnh.
 - Các mode Dịch/Giọng AI/Xuất hiển thị đúng trạng thái chưa cấu hình, không giả lập provider thật.

## [v0.2.8] - 2026-11-03
- **Yêu cầu**: Rà soát và xóa file Python do agent tạo nhưng hiện không có đường dẫn sử dụng.
- **Chi tiết kỹ thuật**:
 - Xóa `apps/ai-worker/app/subtitle_removal/mask_tracking.py` vì chưa được import trong runtime hoặc test hiện tại.
 - Giữ lại các file Python còn lại vì chúng là entry point, package marker, model, service, pipeline, module được import hoặc test trực tiếp.
 - Cập nhật `PROJECT_MAP.md` để không còn liệt kê module đã xóa.
- **Lưu ý kỹ thuật & chưa kiểm thử**:
 - Không xóa `.venv`, `node_modules`, `.env`, SQLite hoặc file dữ liệu; các mục này vẫn cần cho chạy dự án.
 - Chưa chạy build lại vì thay đổi chỉ xóa module Python chưa được dùng.

## [v0.2.7] - 2026-11-03
- **Yêu cầu**: Xóa các file tạm và artifact build do quá trình phát triển tạo ra nhưng không cần giữ trong workspace.
- **Chi tiết kỹ thuật**:
 - Xóa `apps/desktop/dist`, `apps/desktop/dist-electron`, `apps/server/dist` và `apps/desktop/tsconfig.app.tsbuildinfo` bằng script clean có xác nhận.
 - Giữ nguyên `node_modules`, `.venv`, `.env`, SQLite database và source code vì đây là dependency, môi trường chạy, cấu hình hoặc dữ liệu có thể cần tiếp tục sử dụng.
- **Lưu ý kỹ thuật & chưa kiểm thử**:
 - Không chạy build lại sau khi dọn để workspace không sinh lại artifact; lần build tiếp theo sẽ tạo lại các thư mục này khi cần.
 - Một số cache `.vite` nằm trong `node_modules` được giữ nguyên theo quy tắc không xóa dependency.

## [v0.2.6] - 2026-11-03
- **Yêu cầu**: Đưa toàn bộ file terminal ra thư mục gốc để developer không phải mở folder `scripts`.
- **Chi tiết kỹ thuật**:
 - Di chuyển menu và các bước `01–06`, `90` ra root repository.
 - Cập nhật đường dẫn gọi nội bộ, `HUONG_DAN_TERMINAL.md`, `PROJECT_MAP.md` và menu tổng theo vị trí mới.
 - Giữ file hỗ trợ `_NOI_BO_hien-thi-dia-chi.cmd` ở root và không xem nó là bước chạy độc lập.
- **Lưu ý kỹ thuật & chưa kiểm thử**:
 - Thư mục `scripts` không còn được dùng; các file `.cmd` nằm trực tiếp cạnh `README.md` và `PROJECT_MAP.md`.
 - Không thay đổi mã nguồn nghiệp vụ.

## [v0.2.5] - 2026-11-03
- **Yêu cầu**: Tạo file map đầy đủ cho toàn dự án và lưu quy trình tự duy trì map vào quy ước agent.
- **Chi tiết kỹ thuật**:
 - Mở rộng `PROJECT_MAP.md` thành bản đồ toàn repository gồm kiến trúc, cây thư mục, vai trò module, API, database, luồng dữ liệu, cấu hình, terminal scripts, test và trạng thái triển khai.
 - Thêm bảng điểm bắt đầu giúp developer xác định nhanh file cần mở theo nhu cầu sửa đổi.
 - Bổ sung vào `AGENTS.md` quy định bắt buộc tự tạo `PROJECT_MAP.md` cho repository mới và cập nhật trong cùng lượt khi cấu trúc/hợp đồng thay đổi.
 - Quy định project map phải phân biệt trung thực phần hoạt động, mô phỏng, chưa kiểm thử và chưa triển khai.
- **Lưu ý kỹ thuật & chưa kiểm thử**:
 - Chỉ thay đổi tài liệu và số phiên bản; không thay đổi hành vi nghiệp vụ.

## [v0.2.4] - 2026-11-03
- **Yêu cầu**: Lưu quy trình tự tạo bộ file terminal vào quy ước agent để các dự án sau không cần nhắc lại.
- **Chi tiết kỹ thuật**:
 - Bổ sung vào `AGENTS.md` quy định agent phải tự tạo hoặc chuẩn hóa bộ công cụ terminal khi khởi tạo repository hay khi dự án chưa có luồng developer rõ ràng.
 - Chuẩn hóa cấu trúc đánh số `00`, `01–06`, bước clean `90`, file `_NOI_BO_`, tài liệu `HUONG_DAN_TERMINAL.md` và liên kết từ README.
 - Ghi rõ trách nhiệm từng bước, exit code, URL local, xử lý cấu hình/database và yêu cầu điều chỉnh theo stack thực tế.
 - Bổ sung ràng buộc an toàn cho clean và danh sách kiểm tra bắt buộc sau khi tạo script.
- **Lưu ý kỹ thuật & chưa kiểm thử**:
 - Đây là thay đổi quy ước và số phiên bản; không thay đổi hành vi nghiệp vụ của ứng dụng.

## [v0.2.3] - 2026-11-03
- **Yêu cầu**: Đánh số thứ tự tên các file terminal để developer biết đúng trình tự và tránh chạy nhầm.
- **Chi tiết kỹ thuật**:
 - Đổi menu tổng thành `00_CONG_CU_DEV.cmd`; đổi các script thành bước `01` kiểm tra, `02` cài đặt, `03` chạy dev, `04` test, `05` build và `06` mở database.
 - Đưa clean xuống bước `90-lam-sach.cmd` để thể hiện đây là thao tác không chạy thường xuyên.
 - Thêm xác nhận bắt buộc: chỉ clean khi developer nhập chính xác `XOA`; giá trị khác sẽ hủy mà không xóa file.
 - Đánh dấu script in URL là `_NOI_BO_hien-thi-dia-chi.cmd` và cập nhật toàn bộ menu, README, tài liệu terminal theo tên mới.
- **Lưu ý kỹ thuật & chưa kiểm thử**:
 - Đã chạy thành công `04-test.cmd` (3 Vitest, 6 Python unittest) và `05-build.cmd` sau khi đổi tên.
 - Đã xác minh `90-lam-sach.cmd` hủy an toàn khi không nhập `XOA`.
 - Không thay đổi mã nguồn nghiệp vụ hoặc dữ liệu SQLite.

## [v0.2.2] - 2026-11-03
- **Yêu cầu**: Thêm tài liệu và file chạy cứng để developer cài đặt, clean, build, test, chạy development và thấy rõ các địa chỉ local trên terminal.
- **Chi tiết kỹ thuật**:
 - Thêm `HUONG_DAN_TERMINAL.md` với lệnh PowerShell/CMD, yêu cầu môi trường, URL local và hướng dẫn xử lý lỗi.
 - Thêm `CONG_CU_DEV.cmd` làm menu tổng và các script riêng trong `scripts/` cho cài đặt, kiểm tra môi trường, chạy dev, build, test, làm sạch và Prisma Studio.
 - Script chạy development in rõ URL React/Vite, backend health, AI Worker health/Swagger và Prisma Studio trên terminal.
 - Chuẩn hóa lệnh AI Worker/test dùng Python trong `.venv`; thêm lệnh `pnpm db:studio`.
 - Script clean chỉ xóa build/cache trong phạm vi đã xác định, giữ nguyên source code, dependency, `.env` và SQLite database.
- **Lưu ý kỹ thuật & chưa kiểm thử**:
 - Đã chạy trực tiếp và xác minh `kiem-tra-moi-truong.cmd`, `hien-thi-dia-chi.cmd`, `build.cmd`, `test.cmd` và chu trình `lam-sach.cmd` → `build.cmd`.
 - Máy kiểm tra chưa có FFmpeg/FFprobe; script đã hiển thị cảnh báo tương ứng thay vì báo sẵn sàng sai.
 - Các script được thiết kế cho Windows; cài đặt đầy đủ PaddleOCR có thể mất nhiều thời gian và cần kết nối mạng.
 - Build hiện chưa tạo Windows installer hoàn chỉnh.

## [v0.2.1] - 2026-11-03
- **Yêu cầu**: Bổ sung quy định bắt buộc ưu tiên tiếng Việt cho mọi vị trí có thể tự đặt tên trong code và comment rõ luồng bằng tiếng Việt.
- **Chi tiết kỹ thuật**:
 - Cập nhật `AGENTS.md` để áp dụng tên tiếng Việt cho biến, hàm, tham số, type, component, service, field nội bộ, test, file/folder và CSS class khi hệ sinh thái cho phép.
 - Quy định identifier mặc định dùng tiếng Việt không dấu; comment, UI, thông báo và tài liệu dùng tiếng Việt có dấu đầy đủ.
 - Bổ sung ngoại lệ rõ ràng cho hợp đồng API, database, framework, thư viện, protocol và các tên kỹ thuật không được tự ý đổi.
 - Yêu cầu tên hàm thể hiện hành động/tác dụng và comment tiếng Việt giải thích lý do, luồng dữ liệu, thay đổi state tại các đoạn không hiển nhiên.
- **Lưu ý kỹ thuật & chưa kiểm thử**:
 - Đây là thay đổi quy ước; không tự động đổi hàng loạt tên trong mã nguồn hiện có để tránh gây lỗi ngoài phạm vi.
 - Chỉ thay đổi tài liệu, không thay đổi hành vi ứng dụng.

## [v0.2.0] - 2026-11-03
- **Yêu cầu**: Bắt đầu Phase 2, triển khai pipeline xóa phụ đề Trung gắn cứng và preview khôi phục hình ảnh.
- **Chi tiết kỹ thuật**:
 - Thêm các module AI Worker cho ROI, phát hiện thành phần chữ, mask generator, dilation, mask tracking, temporal IoU, quality metrics và engine factory.
 - Thêm OpenCV inpainting CPU với Telea/Navier–Stokes, bán kính tùy chỉnh và feathering biên mask; adapter AI trả đúng trạng thái “Chưa cài mô hình AI”.
 - Thêm API preview xóa phụ đề một frame, validation nhiều ROI và lưu cấu hình ROI vào project.
 - Thêm màn hình “Xóa phụ đề Trung” với kéo/resize vùng, lựa chọn frame, preview trước/sau/so sánh/mask và cảnh báo chất lượng.
 - Thêm test video tổng hợp có đường dẫn Unicode để xác minh pipeline đọc frame, tạo mask, inpaint và mã hóa ảnh preview.
- **Lưu ý kỹ thuật & chưa kiểm thử**:
 - Đã chạy thành công `pnpm build`, 3 Vitest, 6 Python unittest và FastAPI health smoke test.
 - PaddleOCR thật, xử lý interval/toàn video, ASS tiếng Việt, dịch thuật, TTS, audio mixing và export MP4 chưa được triển khai trong phiên bản này.
 - Chưa kiểm thử trên phim thật; OpenCV inpainting có thể tạo artefact trên nền chuyển động/phức tạp và luôn cần người dùng duyệt preview.

## [v0.1.1] - 2026-11-03
- **Yêu cầu**: Loại tên và ràng buộc của dự án cũ khỏi các file Markdown dùng làm mẫu cho repository khác.
- **Chi tiết kỹ thuật**:
 - Tổng quát hóa `AGENTS.md`, bỏ đường dẫn máy cá nhân và quy tắc chỉ dành cho báo cáo của dự án cũ.
 - Tổng quát hóa skill cập nhật changelog, bỏ phụ thuộc vào tên dự án và nền tảng tự động hóa cũ.
 - Viết lại skill kiến trúc backend thành bộ nguyên tắc độc lập với tên dự án, runtime, database và framework.
- **Lưu ý kỹ thuật & chưa kiểm thử**:
 - `README.md`, `PROJECT_MAP.md`, `docs/IMPLEMENTATION_STATUS.md` và các mục changelog cũ vẫn giữ tên VietDub AI Studio vì đây là tài liệu và lịch sử riêng của repository hiện tại.
 - Chỉ thay đổi tài liệu, không thay đổi mã nguồn chạy ứng dụng.

## [v0.1.0] - 2026-11-03
- **Yêu cầu**: Khởi tạo VietDub AI Studio theo cấu trúc repository rõ ràng và bắt đầu vertical slice nhập video, OCR, chỉnh sửa phụ đề.
- **Chi tiết kỹ thuật**:
 - Tạo pnpm monorepo gồm Electron/React desktop, Node/Express server, Python/FastAPI AI Worker và package kiểu dữ liệu dùng chung.
 - Thêm luồng chọn video an toàn qua preload, FFprobe metadata, Prisma/SQLite project và API lưu đoạn phụ đề.
 - Thêm giao diện tiếng Việt cho nhập video, cấu hình vùng OCR chuẩn hóa, xem và chỉnh sửa segment.
 - Thêm thuật toán gộp mẫu OCR liền kề và kiểm thử trường hợp câu giống nhau xuất hiện lại ở thời điểm khác.
 - Thêm `README.md` và `PROJECT_MAP.md` mô tả trạng thái, cách chạy và cấu trúc dự án.
- **Lưu ý kỹ thuật & chưa kiểm thử**:
 - Endpoint OCR hiện dùng dữ liệu kiểm thử có nhãn rõ ràng; chưa lấy frame và chưa chạy PaddleOCR thật.
 - Dịch thuật, TTS, timeline, xuất MP4 và đóng gói Windows chưa được triển khai trong phiên bản này.
 - Đã chạy thành công `pnpm build`, 3 Vitest và 2 Python unittest; Prisma Client và SQLite schema đã tạo thành công.
 - Máy kiểm tra hiện dùng Python 3.14 và chưa có FFprobe trong `PATH`, vì vậy chưa xác minh PaddleOCR/FastAPI và nhập một video thật; tài liệu vẫn yêu cầu môi trường Python 3.11 tương thích.
