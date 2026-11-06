# PROJECT MAP — VietVoice AI Studio

> Bản đồ kỹ thuật toàn repository. Cập nhật file này khi thêm, xóa, đổi tên module, API, database model, script hoặc luồng xử lý chính.

## 1. Điểm bắt đầu dành cho developer

| Nhu cầu | Mở file |
|---|---|
| Cài đặt và chạy dự án | `HUONG_DAN_TERMINAL.md` hoặc `00_CONG_CU_DEV.cmd` |
| Xem trạng thái phần đã làm/chưa làm | `docs/IMPLEMENTATION_STATUS.md` |
| Xem quy ước bắt buộc | `AGENTS.md` |
| Xem lịch sử thay đổi | `CHANGELOG.md` |
| Sửa giao diện chính | `apps/desktop/src/App.tsx` |
| Sửa API Node | `apps/server/src/index.ts` |
| Sửa API Python | `apps/ai-worker/app/main.py` |
| Sửa schema SQLite | `apps/server/prisma/schema.prisma` |
| Sửa kiểu dữ liệu dùng chung | `packages/shared/src/index.ts` |

## 2. Kiến trúc chạy thực tế

```text
Người dùng
   │
   ▼
Electron main process ── IPC giới hạn ──► React renderer
                                             │
                                             │ HTTP 127.0.0.1:43111
                                             ▼
                                      Node/Express server
                                        │            │
                                        │ Prisma     │ HTTP 127.0.0.1:43112
                                        ▼            ▼
                                     SQLite     Python/FastAPI Worker
                                                     │
                                                     ├── OpenCV / NumPy
                                                     ├── PaddleOCR v5 mobile
                                                     └── FFmpeg/FFprobe (phụ thuộc hệ thống)
```

Ranh giới trách nhiệm:

- Electron: vòng đời desktop, hộp thoại file và preload bridge.
- React: state giao diện, thao tác người dùng và preview.
- Node server: validation, persistence, media HTTP Range, điều phối job/worker và FFprobe.
- Python worker: computer vision, OCR và inpainting.
- FFmpeg/FFprobe: đọc metadata, xử lý media và export trong các phase tiếp theo.

## 3. Cây thư mục đầy đủ

```text
video-ai/
├── data/jobs/                              # Snapshot job runtime, không commit
├── data/previews/                          # Proxy VP8 xem trước, không commit
├── .agents/
│   └── skills/
│       ├── backend-architecture/SKILL.md   # Quy tắc backend dùng chung
│       └── changelog-update/SKILL.md       # Quy tắc cập nhật phiên bản
├── apps/
│   ├── desktop/
│   │   ├── electron/
│   │   │   ├── main.ts                     # Cửa sổ Electron, file picker, bảo mật renderer
│   │   │   ├── preload.cts                 # CommonJS bridge `vietvoiceDesktop.selectVideo()` cho Electron sandbox
│   │   │   └── tsconfig.json
│   │   ├── src/
│   │   │   ├── features/subtitle-removal/
│   │   │   │   ├── SubtitleRemovalPage.tsx # Workspace preview xóa phụ đề
│   │   │   │   └── SubtitleRegionSelector.tsx # Kéo/resize ROI chuẩn hóa
│   │   │   ├── features/editor/
│   │   │   │   ├── KhongGianBienTap.tsx    # Workspace, mode, shortcut, undo/autosave
│   │   │   │   ├── TrinhPhatVideo.tsx      # Video, overlay và frame step
│   │   │   │   ├── BangPhuDe.tsx           # Bảng phụ đề ảo hóa, sửa inline
│   │   │   │   └── DongThoiGian.tsx        # Timeline Canvas và playhead
│   │   │   ├── services/api.ts             # Client gọi Node API cục bộ
│   │   │   ├── utils/
│   │   │   │   ├── format-time.ts          # Định dạng millisecond
│   │   │   │   └── format-time.test.ts
│   │   │   │   ├── job-progress.ts         # Phần trăm từ đơn vị tiến độ thật
│   │   │   │   └── job-progress.test.ts
│   │   │   ├── App.tsx                     # Điều phối màn OCR/removal và state project
│   │   │   ├── main.tsx                    # React entry
│   │   │   ├── styles.css                  # Style desktop hiện tại
│   │   │   └── vite-env.d.ts               # Kiểu preload bridge
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsconfig.app.json
│   │   └── vite.config.ts
│   ├── server/
│   │   ├── prisma/
│   │   │   └── schema.prisma               # Project và Segment models
│   │   ├── src/
│   │   │   ├── media/
│   │   │   │   ├── probe-media.ts          # Spawn FFprobe bằng argument array
│   │   │   │   └── probe-media.test.ts
│   │   │   └── index.ts                    # Express routes, Zod validation, Prisma/worker
│   │   ├── .env.example                    # Mẫu cấu hình local
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   └── ai-worker/
│       ├── app/
│       │   ├── models/ocr.py                # Pydantic model OCR request/response
│       │   ├── services/ocr_service.py      # PaddleOCR thật, lấy mẫu frame và gộp timestamp
│       │   ├── services/automatic_pipeline.py # Điều phối OCR → dịch → inpaint → TTS → FFmpeg
│       │   ├── services/job_manager.py       # Job nền, hủy, phục hồi snapshot và tiến độ thật
│       │   ├── models/pipeline.py            # Request/response pipeline tự động
│       │   ├── subtitle/merge.py            # Gộp OCR trùng liền kề
│       │   ├── subtitle_removal/
│       │   │   ├── models.py                # Model ROI/settings/preview
│       │   │   ├── roi.py                   # ROI chuẩn hóa → pixel
│       │   │   ├── text_detection.py        # Connected components nghi là nét chữ
│       │   │   ├── mask_generator.py        # Mask sáng/gradient/dilation trong ROI
│       │   │   ├── temporal_consistency.py  # IoU và cảnh báo thay đổi mask
│       │   │   ├── opencv_inpaint.py        # Telea/NS và feathering
│       │   │   ├── engine_factory.py        # Chọn OpenCV/adapter AI
│       │   │   ├── quality_metrics.py       # Coverage và warning
│       │   │   └── restoration_pipeline.py  # Đọc frame → mask → restore → data URL
│       │   └── main.py                      # FastAPI entry/routes
│       ├── tests/
│       │   ├── test_job_manager.py          # Stage thật, persistence và cancel
│       │   ├── test_merge.py
│       │   └── test_subtitle_removal.py
│       └── requirements.txt
├── packages/
│   └── shared/
│       ├── src/index.ts                     # Contract Project/Segment/ROI/removal/job
│       └── package.json
├── 01-kiem-tra-moi-truong.cmd
├── 02-cai-dat.cmd
├── 03-chay-dev.cmd
├── 04-test.cmd
├── 05-build.cmd
├── 06-mo-database.cmd
├── 90-lam-sach.cmd
├── _NOI_BO_hien-thi-dia-chi.cmd
├── docs/
│   └── IMPLEMENTATION_STATUS.md
├── resources/
│   └── ffmpeg/.gitkeep                      # Chỗ dành cho binary khi packaging
├── 00_CONG_CU_DEV.cmd                       # Menu developer được khuyến nghị
├── AGENTS.md
├── CHANGELOG.md
├── HUONG_DAN_TERMINAL.md
├── PROJECT_MAP.md
├── README.md
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

Không đưa vào map các file sinh tự động: `node_modules`, `.venv`, `dist`, `dist-electron`, cache Python, `*.tsbuildinfo`, `.env` và SQLite runtime.

## 4. Bản đồ ứng dụng desktop

| File | Trách nhiệm | Phụ thuộc chính |
|---|---|---|
| `electron/main.ts` | Tạo cửa sổ, bật `contextIsolation`, tắt `nodeIntegration`, mở file picker | Electron |
| `electron/preload.cts` | Chỉ expose IPC chọn video bằng CommonJS | Electron context bridge trong sandbox |
| `src/App.tsx` | Import video, giữ state project/segment và mở editor | Shared types, API client |
| `KhongGianBienTap.tsx` | 5 mode, undo/redo, autosave, shortcut và đồng bộ selection | Editor components |
| `TrinhPhatVideo.tsx` | Phát video, frame step, time clock, subtitle overlay | HTML video |
| `BangPhuDe.tsx` | Virtualize danh sách dài, search và inline edit | React |
| `DongThoiGian.tsx` | Vẽ track/playhead bằng Canvas và seek theo click | Canvas 2D |
| `SubtitleRemovalPage.tsx` | Settings OpenCV, timestamp, mode preview, gọi removal API | `api.ts` |
| `SubtitleRegionSelector.tsx` | Kéo và resize ROI theo tỷ lệ 0–1 | React pointer events |
| `src/services/api.ts` | Chuyển response Node thành model UI | Fetch, shared types |

Renderer không được gọi filesystem, shell, FFmpeg hoặc Prisma trực tiếp.

## 5. Bản đồ Node API

Base URL development: `http://127.0.0.1:43111`.

| Method | Route | Vai trò | Đích tiếp theo |
|---|---|---|---|
| GET | `/health` | Kiểm tra server | — |
| GET | `/api/projects` | Danh sách project | Prisma |
| POST | `/api/projects/import` | FFprobe và tạo project | FFprobe → Prisma |
| GET | `/api/projects/:projectId/segments` | Lấy segment theo thời gian | Prisma |
| POST | `/api/projects/:projectId/ocr` | Lưu ROI, gọi OCR worker, thay segment | FastAPI → Prisma transaction |
| POST | `/api/projects/:projectId/pipeline/automatic` | Chạy toàn bộ pipeline và lưu segment | FastAPI → Prisma transaction |
| PUT | `/api/projects/:projectId/segments/:segmentId` | Lưu nội dung/timing segment | Prisma |
| POST | `/api/projects/:projectId/subtitle-removal/preview` | Lưu ROI và tạo preview một frame | FastAPI/OpenCV |

Mọi request body được validate bằng Zod trước khi gọi persistence hoặc worker.

## 6. Bản đồ AI Worker API

Base URL development: `http://127.0.0.1:43112`.

| Method | Route | Trạng thái |
|---|---|---|
| GET | `/health` | Hoạt động, báo OCR `test-mode` |
| POST | `/api/ocr/detect` | PaddleOCR v5 mobile trên video thật |
| POST | `/api/pipeline/automatic` | OCR, dịch local, inpaint, TTS, phụ đề và xuất MP4 |
| POST | `/api/subtitle-removal/preview` | Chạy OpenCV thật cho một frame |
| GET | `/docs` | Swagger do FastAPI cung cấp |

## 7. Bản đồ database

SQLite development được cấu hình qua `DATABASE_URL` trong `apps/server/.env`.

### Project

- Nhận diện: `id`, `name`, `sourcePath`.
- Metadata: `durationMs`, `width`, `height`, `frameRate`, `videoCodec`, `audioCodec`.
- Cấu hình: `ocrRegionJson`.
- Theo dõi: `createdAt`, `updatedAt`.
- Quan hệ: một project có nhiều segment.

### Segment

- Timing: `startMs`, `endMs`.
- Nội dung: `originalText`, `translatedText`.
- Review: `ocrConfidence`, `status`.
- Quan hệ: thuộc một project; tự xóa khi project bị xóa.

Media lớn không lưu trong SQLite blob. Database chỉ giữ metadata và đường dẫn.

## 8. Luồng dữ liệu chính

### 8.1 Nhập video

```text
Nút Nhập video
→ Electron file picker
→ React nhận sourcePath
→ POST /api/projects/import
→ FFprobe metadata
→ Prisma Project
→ React cập nhật project/video panel
```

### 8.2 OCR hiện tại

```text
ROI trong React
→ POST /api/projects/:id/ocr
→ Node lưu ROI
→ FastAPI /api/ocr/detect
→ OCR test-mode trả segment NEEDS_REVIEW
→ Prisma transaction thay danh sách segment
→ React hiển thị editor
```

### 8.3 Xóa phụ đề một frame

```text
Timestamp + ROI + settings
→ Node validate và lưu ROI
→ FastAPI đọc frame bằng OpenCV
→ phát hiện nét sáng/gradient trong ROI
→ connected components + dilation
→ Telea hoặc Navier–Stokes
→ quality warnings + ảnh trước/sau/mask
→ React preview để người dùng duyệt
```

### 8.4 Đồng bộ editor

```text
Video timeupdate → playback clock → Canvas playhead
Chọn subtitle/table hoặc clip timeline → selected segment → seek video
Sửa tiếng Việt → state segment + subtitle overlay → debounce 900ms → lưu đúng segment
Ctrl+Z/Ctrl+Y → lịch sử state cục bộ → cập nhật bảng/timeline/preview
```

## 9. Kiểu dữ liệu và quy ước xuyên tầng

- Thời gian: số nguyên millisecond.
- ROI: `x`, `y`, `width`, `height` chuẩn hóa từ 0 đến 1.
- Trạng thái segment: `DETECTED`, `TRANSLATED`, `VOICE_READY`, `NEEDS_REVIEW`, `APPROVED`.
- Removal method: `TELEA` hoặc `NS`.
- Ảnh preview: data URL JPEG/PNG; chỉ dùng cho preview, không phải storage media dài hạn.
- Field hợp đồng API giữ nguyên giữa shared type, Node, Python và database mapping.

## 10. Cấu hình và cổng

| Biến/cổng | Mục đích |
|---|---|
| `DATABASE_URL` | Đường dẫn SQLite Prisma |
| `PORT` / `43111` | Node API |
| `AI_WORKER_URL` / `43112` | FastAPI Worker |
| `FFPROBE_PATH` | Binary FFprobe |
| `5173` | Vite renderer |
| `5555` | Prisma Studio tùy chọn |

## 11. Bản đồ lệnh developer

```text
00 menu
└── 01 kiểm tra môi trường
    └── 02 cài dependency + Prisma
        └── 03 chạy dev
            ├── 04 test
            └── 05 build

06 mở database: tùy chọn
90 clean: chỉ khi cần, bắt buộc nhập XOA
```

Chi tiết lệnh và URL: `HUONG_DAN_TERMINAL.md`.

## 12. Kiểm thử hiện có

| Test | Nội dung |
|---|---|
| `format-time.test.ts` | Định dạng millisecond |
| `probe-media.test.ts` | Parse frame rate FFprobe |
| `test_merge.py` | Gộp OCR liền kề, không gộp câu lặp cách xa |
| `test_subtitle_removal.py` | ROI, kích thước inpaint, temporal IoU, video Unicode tổng hợp |

## 13. Trạng thái và giới hạn

Hoạt động trong mã nguồn:

- Electron file picker và preload giới hạn.
- FFprobe adapter, Prisma project/segment.
- Editor segment cơ bản.
- Workspace 5 mode, bảng ảo hóa, timeline Canvas, playback đồng bộ và autosave.
- OpenCV removal preview một frame.
- Bộ terminal scripts có đánh số.

Mô phỏng có nhãn:

- OCR trả segment test-mode.

Chưa triển khai:

- PaddleOCR video thật và bounding boxes xuyên segment.
- Dịch Trung–Việt/provider/cache/glossary.
- TTS, alignment, timeline và audio mixing.
- Kéo/trim clip timeline, waveform thật, cấu hình phím tắt và persistence kích thước panel.
- Xử lý removal theo interval/toàn video.
- ASS/SRT rendering và final MP4 export.
- Windows installer hoàn chỉnh.

## 14. Quy tắc cập nhật map

Cập nhật `PROJECT_MAP.md` trong cùng lượt thay đổi khi xảy ra một trong các trường hợp:

- Thêm, xóa hoặc đổi tên app/package/module quan trọng.
- Thêm, xóa hoặc đổi route API.
- Thay đổi database model hoặc quan hệ.
- Thêm luồng nghiệp vụ xuyên nhiều tầng.
- Đổi cổng, biến môi trường, entry point hoặc script developer.
- Trạng thái một tính năng chuyển giữa mô phỏng, hoạt động và chưa triển khai.

Không ghi file sinh tự động hoặc liệt kê mọi asset nhỏ nếu chúng không giúp developer tìm luồng xử lý.
