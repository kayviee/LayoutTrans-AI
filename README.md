# LayoutTrans AI — Trình Dịch Thuật & Bảo Toàn Bố Cục Sách

**LayoutTrans AI** là công cụ web chuyên dụng được thiết kế riêng cho việc chuyển ngữ tài liệu/sách học thuật sang tiếng Việt mà vẫn **giữ nguyên 100% bố cục dàn trang gốc** (bố cục 2 cột, bảng biểu, khung ghi chú callout, công thức toán LaTeX).

---

## 🌟 Điểm nổi bật

1. **Siêu nhẹ máy (Zero Node Modules Bloat):**
   - Không cần cài hàng trăm MB thư viện nặng nề.
   - Sử dụng HTML5, CSS3 tinh tế và Vanilla JS hiện đại kết hợp CDN chất lượng cao.
   - Dung lượng toàn bộ công cụ chỉ **dưới 100 KB**!

2. **Kế thừa triết lý dàn trang cao cấp:**
   - **Bố cục 2 cột hoặc 1 cột:** Tự động giữ nguyên cấu trúc trang như sách gốc.
   - **Khung hộp ghi chú (Callout Boxes):** Giữ nguyên định dạng các khung Note, Tip, Warning, Definition thường gặp trong sách giáo trình.
   - **Công thức toán học chuẩn KaTeX:** Tự động hiển thị công thức LaTeX rõ nét, chuẩn học thuật quốc tế.
   - **Bảng biểu (Tables):** Dịch trọn vẹn nội dung bên trong và giữ nguyên cấu trúc hàng/cột.

3. **Chế độ xem linh hoạt (3 chế độ):**
   - **Song song đối chiếu:** Trang gốc PDF bên trái, bản dịch tiếng Việt bên phải.
   - **Cuộn đồng bộ (Synced Scrolling):** Cuộn bên này thì bên kia tự động trượt theo.
   - **Chỉ bản dịch (Full Reading):** Xem toàn màn hình bản dịch dàn trang như một cuốn sách điện tử tiếng Việt.
   - **Chỉ bản gốc:** Đối chiếu nhanh khi cần.

4. **Tùy chọn xuất file đa dạng:**
   - **Xuất Web HTML:** Một file duy nhất đọc offline cực đẹp, giữ nguyên toàn bộ CSS và công thức toán.
   - **Xuất Word (.docx):** Tạo file Word trực tiếp trên trình duyệt để biên tập thêm.
   - **In / Lưu PDF:** Tích hợp bộ quy chuẩn in ấn chuyên nghiệp (Cmd + P) cho ra bản in PDF dàn trang chuẩn xuất bản.

5. **Linh hoạt Model AI:**
   - Hỗ trợ **Gemini 2.5 Flash** (siêu nhanh & tiết kiệm), **Gemini 1.5 Flash** và **Gemini 1.5 Pro** (dành cho sách học thuật sâu).
   - Tùy chỉnh số trang mỗi chunk (mặc định 4 trang/chunk để AI không bị quá tải).

---

## 🚀 Cách mở và sử dụng

### Bước 1: Khởi động
Mở **Terminal** và chạy lệnh:
```bash
cd /Users/kayvienguyen/Downloads/A_Study/Book_Edit/tools/layout-translator
./start.sh
```
Trình duyệt sẽ tự động mở lên tại địa chỉ: `http://localhost:3333`

### Bước 2: Thiết lập API Key
- Bấm vào nút **"Cài đặt Key"** ở góc phải trên cùng.
- Dán mã **Gemini API Key** lấy từ [Google AI Studio](https://aistudio.google.com/api-keys) (miễn phí hoặc tài khoản Pro của bạn).
- Bấm **Lưu Cấu hình**.

### Bước 3: Kéo thả sách và Dịch
- Kéo thả file PDF vào ô trung tâm.
- Bấm **"Bắt đầu dịch"**.
- Theo dõi tiến độ trực tiếp trên màn hình đối chiếu song song!
