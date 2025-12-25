#!/bin/bash

# Script để debug Nginx config cuối cùng

CONFIG_FILE="/etc/nginx/sites-available/n8n"

echo "🔍 Debug Nginx Config - Final Check"
echo "===================================="
echo ""

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ File không tồn tại: $CONFIG_FILE"
    exit 1
fi

echo "1️⃣ Kiểm tra location blocks..."
echo ""

# Đếm số lượng location blocks
UPLOADS_COUNT=$(sudo grep -c "location /uploads/" "$CONFIG_FILE" 2>/dev/null || echo "0")
API_COUNT=$(sudo grep -c "location /api/" "$CONFIG_FILE" 2>/dev/null || echo "0")
ROOT_COUNT=$(sudo grep -c "^[[:space:]]*location /[^/]" "$CONFIG_FILE" 2>/dev/null || echo "0")

echo "   Location /uploads/: $UPLOADS_COUNT"
echo "   Location /api/: $API_COUNT"
echo "   Location /: $ROOT_COUNT"
echo ""

if [ "$UPLOADS_COUNT" -eq 0 ]; then
    echo "   ❌ CHƯA CÓ location /uploads/"
else
    echo "   ✅ Có location /uploads/"
    UPLOADS_LINE=$(sudo grep -n "location /uploads/" "$CONFIG_FILE" 2>/dev/null | head -1 | cut -d: -f1)
    echo "   Dòng: $UPLOADS_LINE"
    echo "   Nội dung:"
    sudo sed -n "${UPLOADS_LINE},$((UPLOADS_LINE+10))p" "$CONFIG_FILE" 2>/dev/null | sed 's/^/      /'
fi

echo ""

if [ "$API_COUNT" -eq 0 ]; then
    echo "   ❌ CHƯA CÓ location /api/"
else
    echo "   ✅ Có location /api/"
    API_LINE=$(sudo grep -n "location /api/" "$CONFIG_FILE" 2>/dev/null | head -1 | cut -d: -f1)
    echo "   Dòng: $API_LINE"
    echo "   Nội dung:"
    sudo sed -n "${API_LINE},$((API_LINE+10))p" "$CONFIG_FILE" 2>/dev/null | sed 's/^/      /'
fi

echo ""

ROOT_LINE=$(sudo grep -n "^[[:space:]]*location /[^/]" "$CONFIG_FILE" 2>/dev/null | head -1 | cut -d: -f1)
if [ -n "$ROOT_LINE" ]; then
    echo "   ✅ Có location / ở dòng: $ROOT_LINE"
else
    ROOT_LINE=$(sudo grep -n "^[[:space:]]*location / {" "$CONFIG_FILE" 2>/dev/null | head -1 | cut -d: -f1)
    if [ -n "$ROOT_LINE" ]; then
        echo "   ✅ Có location / { ở dòng: $ROOT_LINE"
    else
        echo "   ⚠️  Không tìm thấy location /"
    fi
fi

echo ""
echo "2️⃣ Kiểm tra thứ tự..."

if [ -n "$UPLOADS_LINE" ] && [ -n "$ROOT_LINE" ]; then
    if [ "$UPLOADS_LINE" -lt "$ROOT_LINE" ]; then
        echo "   ✅ location /uploads/ đứng TRƯỚC location / (ĐÚNG!)"
    else
        echo "   ❌ location /uploads/ đứng SAU location / (SAI!)"
        echo "   💡 Cần di chuyển location /uploads/ lên trước location /"
    fi
    echo "   /uploads/ ở dòng: $UPLOADS_LINE"
    echo "   / ở dòng: $ROOT_LINE"
else
    if [ -z "$UPLOADS_LINE" ]; then
        echo "   ❌ Chưa có location /uploads/"
    fi
fi

echo ""
echo "3️⃣ Kiểm tra duplicate..."

if [ "$UPLOADS_COUNT" -gt 1 ]; then
    echo "   ⚠️  Có $UPLOADS_COUNT location /uploads/ (duplicate!)"
    echo "   Dòng:"
    sudo grep -n "location /uploads/" "$CONFIG_FILE" 2>/dev/null | cut -d: -f1 | sed 's/^/      /'
fi

if [ "$API_COUNT" -gt 1 ]; then
    echo "   ⚠️  Có $API_COUNT location /api/ (duplicate!)"
    echo "   Dòng:"
    sudo grep -n "location /api/" "$CONFIG_FILE" 2>/dev/null | cut -d: -f1 | sed 's/^/      /'
fi

echo ""
echo "4️⃣ Test Nginx config..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo "   ✅ Config syntax OK"
else
    echo "   ❌ Config có lỗi syntax!"
    sudo nginx -t 2>&1 | tail -5
fi

echo ""
echo "5️⃣ Kiểm tra Nginx status..."
if sudo systemctl is-active --quiet nginx; then
    echo "   ✅ Nginx đang chạy"
    echo "   Last reload: $(sudo systemctl show nginx --property=ActiveEnterTimestamp --value 2>/dev/null || echo 'unknown')"
else
    echo "   ❌ Nginx không chạy!"
fi

echo ""
echo "6️⃣ Test domain..."
curl -I "https://n8n.aidocmanageagent.io.vn/uploads/test.pdf?t=$(date +%s)" 2>&1 | grep -E "HTTP|Content-Type" | head -2

echo ""
echo "📋 Khuyến nghị:"
if [ "$UPLOADS_COUNT" -eq 0 ]; then
    echo "   ❌ Cần thêm location /uploads/"
    echo "   Chạy: ./api/fix-nginx-complete.sh"
elif [ "$UPLOADS_LINE" -gt "$ROOT_LINE" ] 2>/dev/null; then
    echo "   ❌ Cần sắp xếp lại thứ tự location blocks"
    echo "   Chạy: ./api/fix-nginx-complete.sh"
elif [ "$UPLOADS_COUNT" -gt 1 ]; then
    echo "   ⚠️  Có duplicate location blocks"
    echo "   Cần xóa duplicate và chỉ giữ 1 location /uploads/ và 1 location /api/"
else
    echo "   ✅ Config có vẻ đúng"
    echo "   💡 Nếu vẫn không hoạt động, thử:"
    echo "      sudo systemctl restart nginx"
    echo "      Clear Cloudflare cache (nếu dùng Cloudflare)"
fi

