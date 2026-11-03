#!/bin/bash
# ===================================================================
# LayoutTrans AI — Launcher Script (Siêu nhẹ, không tốn tài nguyên)
# ===================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

PORT=3333
while lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

echo "=========================================================="
echo "🚀 Đang khởi động LayoutTrans AI (Dịch PDF có kiểm định)..."
echo "📍 Mở trình duyệt tại: http://localhost:$PORT"
echo "💡 Nhấn Ctrl + C để dừng khi không dùng nữa."
echo "=========================================================="

# Tự động mở trình duyệt sau 1 giây
(sleep 1 && open "http://localhost:$PORT") &

# Chạy server tĩnh siêu nhẹ bằng Python có sẵn trên macOS (chỉ tốn vài MB RAM)
python3 -m http.server "$PORT" --bind 127.0.0.1
