#!/bin/bash

# Script để verify và fix Nginx config

CONFIG_FILE="/etc/nginx/sites-available/n8n"

echo "🔍 Verify Nginx Config"
echo "====================="
echo ""

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ File không tồn tại: $CONFIG_FILE"
    exit 1
fi

echo "📋 File config: $CONFIG_FILE"
echo ""

# Kiểm tra location /uploads/
echo "1️⃣ Kiểm tra location /uploads/..."
if sudo grep -q "location /uploads/" "$CONFIG_FILE"; then
    echo "   ✅ Có location /uploads/"
    UPLOADS_LINE=$(sudo grep -n "location /uploads/" "$CONFIG_FILE" | head -1 | cut -d: -f1)
    echo "   Dòng: $UPLOADS_LINE"
    echo ""
    echo "   Nội dung:"
    sudo sed -n "${UPLOADS_LINE},$((UPLOADS_LINE+8))p" "$CONFIG_FILE" | sed 's/^/   /'
else
    echo "   ❌ CHƯA CÓ location /uploads/"
fi

echo ""
echo "2️⃣ Kiểm tra location /api/..."
if sudo grep -q "location /api/" "$CONFIG_FILE"; then
    echo "   ✅ Có location /api/"
    API_LINE=$(sudo grep -n "location /api/" "$CONFIG_FILE" | head -1 | cut -d: -f1)
    echo "   Dòng: $API_LINE"
    echo ""
    echo "   Nội dung:"
    sudo sed -n "${API_LINE},$((API_LINE+8))p" "$CONFIG_FILE" | sed 's/^/   /'
else
    echo "   ❌ CHƯA CÓ location /api/"
fi

echo ""
echo "3️⃣ Kiểm tra location /..."
ROOT_LINE=$(sudo grep -n "^[[:space:]]*location /[^/]" "$CONFIG_FILE" | head -1 | cut -d: -f1)
if [ -n "$ROOT_LINE" ]; then
    echo "   ✅ Có location /"
    echo "   Dòng: $ROOT_LINE"
else
    ROOT_LINE=$(sudo grep -n "^[[:space:]]*location / {" "$CONFIG_FILE" | head -1 | cut -d: -f1)
    if [ -n "$ROOT_LINE" ]; then
        echo "   ✅ Có location / {"
        echo "   Dòng: $ROOT_LINE"
    else
        echo "   ⚠️  Không tìm thấy location /"
    fi
fi

echo ""
echo "4️⃣ Kiểm tra thứ tự..."
if [ -n "$UPLOADS_LINE" ] && [ -n "$ROOT_LINE" ]; then
    if [ "$UPLOADS_LINE" -lt "$ROOT_LINE" ]; then
        echo "   ✅ location /uploads/ đứng TRƯỚC location / (ĐÚNG!)"
    else
        echo "   ❌ location /uploads/ đứng SAU location / (SAI! Cần sửa)"
        echo "   💡 Cần di chuyển location /uploads/ lên trước location /"
    fi
else
    echo "   ⚠️  Không thể kiểm tra thứ tự (thiếu location blocks)"
fi

echo ""
echo "5️⃣ Test Nginx config..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo "   ✅ Config syntax OK"
else
    echo "   ❌ Config có lỗi syntax!"
    sudo nginx -t
fi

echo ""
if [ -z "$UPLOADS_LINE" ] || [ -z "$API_LINE" ]; then
    echo "❌ CẦN THÊM LOCATION BLOCKS!"
    echo ""
    echo "🚀 Chạy script để tự động thêm:"
    echo "   ./api/add-nginx-locations.sh"
    echo ""
    echo "Hoặc sửa thủ công theo docs/MANUAL_ADD_LOCATIONS.md"
else
    echo "✅ Config đã có location blocks!"
    echo ""
    echo "💡 Nếu vẫn lỗi, thử:"
    echo "   sudo systemctl restart nginx"
fi

