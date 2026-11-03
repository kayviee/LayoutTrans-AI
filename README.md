# LayoutTrans AI (v1.7.0)

LayoutTrans AI là trình đọc song ngữ và tạo bản dịch reflow chất lượng cao cho PDF học thuật & tài liệu chuyên ngành. Bản PDF gốc luôn được giữ ở khung đối chiếu; bản dịch được kiểm định độ phủ tới từng đoạn văn và chỉ cho xuất file khi mọi trang đều đạt chuẩn 100%.

## Các nâng cấp trọng tâm (v1.7.0)

1. **Chấm dứt lỗi "dịch một nửa, còn lại giữ nguyên tiếng Anh"**:
   - Mặc định gộp **2 trang/request** kèm `maxOutputTokens: 65536` để Gemini không bao giờ bị tràn bộ đệm đầu ra khi dịch các trang học thuật dày chữ.
   - Gửi đồng thời cả **PDF gốc (Multimodal)** lẫn **toàn bộ lớp văn bản trích xuất của từng trang** làm danh sách đối chiếu bắt buộc (100% Checklist).
   - Bộ kiểm định QA mới kiểm tra **từng đoạn văn (`<p>`, `<li>`, `<figcaption>`)** để phát hiện ngay bất kỳ đoạn văn tiếng Anh nào bị bỏ sót (`PARTIAL_UNTRANSLATED_ENGLISH`) và tự động yêu cầu dịch bù đúng trang đó.
   - Có nút **`🔄 Dịch lại trang N`** ngay trên đầu mỗi trang để dịch lại độc lập bất kỳ trang nào chỉ với 1 cú nhấp chuột.

2. **Hình ảnh & Biểu đồ sắc nét 3x High-DPI + Bảng dịch thành phần chuẩn mực dưới hình**:
   - Loại bỏ hoàn toàn cơ chế đè các ô chữ nhỏ li ti, chồng chéo lên ảnh mờ.
   - Mọi hình vẽ, sơ đồ, biểu đồ (`Figure`, `Chart`, `Diagram`) đều được cắt trực tiếp từ canvas **High-DPI 3.0x** siêu nét, giữ nguyên 100% đồ họa gốc không bị sạn.
   - Ngay bên dưới mỗi hình là **Bảng dịch chi tiết các thành phần trong Hình / Biểu đồ** (`<table class="figure-translation-table">`) gồm 3 cột rõ ràng: **Vị trí / Thành phần** — **Thuật ngữ gốc** — **Bản dịch & Giải nghĩa tiếng Việt**.
   - Bấm trực tiếp vào hình hoặc nút **Phóng to Hình & Bảng dịch** để mở chế độ **Lightbox độ phân giải cao** xem song song ảnh 3x và bảng dịch.

3. **Lưu trữ bền vững 100% cài đặt & Bộ nhớ đệm thông minh (`localStorage`)**:
   - Tự động nhớ mọi tùy chỉnh của người dùng qua các lần mở lại trình duyệt: **Font chữ** (`Auto`, `Times New Roman`, `Merriweather`, `Lora`, `Georgia`, `Palatino`, `Charter`, `Be Vietnam Pro`, `Inter`, `Arial` hoặc Font tùy chọn), **Cỡ chữ (`px`)**, **Tỷ lệ thu phóng PDF (`%`)**, **Chế độ xem (`Song song` / `Chỉ bản dịch` / `Chỉ bản gốc`)**, **Độ rộng thanh kéo chia khung**, **Đồng bộ cuộn**, **Model Gemini**, **Số trang/lần gọi (1–6 trang)**, **Prompt tùy chỉnh**, **Giao diện Sáng/Tối** và **API Key**.
   - Thanh công cụ bên phải có **menu chọn nhanh Font chữ** đổi tức thì trên giao diện đọc, bản in PDF, file HTML và file Word (`.docx`).
   - **Tự động lưu bộ nhớ đệm (Cache) từng trang đã dịch theo từng file PDF**: khi tải lại trang hoặc mở lại đúng file PDF cũ, các trang đã dịch đạt chuẩn sẽ khôi phục ngay lập tức mà không tốn lại API token.

## Cách chạy nhanh

```bash
cd /Users/kayvienguyen/Downloads/C_Tools/01_Local_Projects/Mini_Tools/layout-translator
./start.sh
```
