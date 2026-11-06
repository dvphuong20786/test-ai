---
name: changelog-update
description: Quy tắc dùng chung — cập nhật CHANGELOG.md ở thư mục gốc sau mỗi prompt có thay đổi dự án. Luôn đọc skill này trước khi kết thúc lượt làm việc có chỉnh sửa file, kể cả khi người dùng không nhắc tới changelog hay phiên bản.
---

# Cập nhật CHANGELOG.md (quy tắc riêng của dự án)

Người dùng theo dõi lịch sử phát triển qua `CHANGELOG.md` ở thư mục gốc repository. Mỗi lượt làm việc có thay đổi file phải để lại một mục phiên bản mới để lịch sử không bị đứt đoạn.

## Khi nào áp dụng

- Áp dụng: mọi prompt hoàn thành có chỉnh sửa file trong dự án (code, CSS, dữ liệu mẫu, API, backend, cấu hình, file demo, asset, skill/quy tắc dự án).
- Không áp dụng: lượt chỉ hỏi đáp, giải thích, đọc code, không đổi file nào.
- Nếu người dùng yêu cầu "chỉ tạo/sửa đúng một file" thì vẫn coi CHANGELOG.md là tài liệu đi kèm được phép cập nhật, trừ khi họ nói rõ không ghi changelog.

## Cách làm

1. Đọc phần đầu `CHANGELOG.md` để lấy số phiên bản mới nhất.
2. Tăng phiên bản theo SemVer:
   - Patch (`v1.9.0` → `v1.9.1`): chỉnh nhỏ, sửa lỗi, đổi chữ, sửa CSS, cập nhật tài liệu/quy tắc.
   - Minor (`v1.9.x` → `v1.10.0`): tính năng mới, trang mới, phân hệ mới.
   - Major (`v2.0.0`): chỉ khi người dùng yêu cầu hoặc có thay đổi phá vỡ lớn.
3. Chèn mục mới ngay dưới đoạn giới thiệu (trên mục phiên bản cũ mới nhất). Không bao giờ xóa, sửa nội dung hay sắp xếp lại các mục cũ, và giữ nguyên khối "QUY TẮC BẮT BUỘC" ở cuối file. Chỉ sửa mục cũ khi người dùng yêu cầu rõ.
4. Viết bằng tiếng Việt, mô tả trung thực những gì thực sự đã làm, không phóng đại.
5. Không chạy `git commit`/`git push` nếu người dùng chưa yêu cầu. Chỉ ghi mục mới sau khi kiểm tra phù hợp; nếu không thể kiểm tra do môi trường thì ghi rõ trong phần lưu ý.

## Mẫu bắt buộc

```markdown
## [vX.Y.Z] - YYYY-MM-DD
- **Yêu cầu**: <yêu cầu chính của prompt vừa chạy>
- **Chi tiết kỹ thuật**:
 - <màn hình/trang đã tạo hoặc sửa, kèm route nếu có, ví dụ `/trai-nghiem`>
 - <component/file đã thêm hoặc sửa, ví dụ `web/src/components/demo/embedLayer.ts`>
 - <logic xử lý dữ liệu/API đã thay đổi>
- **Lưu ý kỹ thuật & chưa kiểm thử**:
 - <giới hạn, việc cần làm trên máy chủ, hạng mục chưa kiểm thử — ghi "Không có" nếu không có>
```

## Ví dụ

```markdown
## [v1.9.2] - 2026-10-24
- **Yêu cầu**: Sửa nút "Đăng ký" bị lệch trên điện thoại ở trang Bảng giá.
- **Chi tiết kỹ thuật**:
 - Trang `/bang-gia`: chỉnh khoảng cách nút CTA trong `web/src/pages/Pricing.tsx` cho màn hình < 640px.
- **Lưu ý kỹ thuật & chưa kiểm thử**:
 - Đã kiểm tra ở 390px và 1440px; chưa kiểm thử trên Safari iOS thật.
```

Nhắc ngắn gọn trong tin nhắn cuối rằng đã ghi phiên bản mới vào CHANGELOG.md.
