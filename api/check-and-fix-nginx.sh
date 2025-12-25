#!/bin/bash

# Script để kiểm tra và fix Nginx config

CONFIG_FILE="/etc/nginx/sites-available/n8n"

echo "🔍 Kiểm tra và Fix Nginx Config"
echo "================================"
echo ""

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ File không tồn tại: $CONFIG_FILE"
    exit 1
fi

echo "1️⃣ Kiểm tra location blocks hiện tại..."
echo ""

# Kiểm tra location /uploads/
if sudo grep -q "location /uploads/" "$CONFIG_FILE"; then
    echo "   ✅ Có location /uploads/"
    UPLOADS_LINE=$(sudo grep -n "location /uploads/" "$CONFIG_FILE" | head -1 | cut -d: -f1)
    echo "   Dòng: $UPLOADS_LINE"
    echo "   Nội dung:"
    sudo sed -n "${UPLOADS_LINE},$((UPLOADS_LINE+8))p" "$CONFIG_FILE" | sed 's/^/      /'
else
    echo "   ❌ CHƯA CÓ location /uploads/"
    NEED_FIX=true
fi

echo ""

# Kiểm tra location /api/
if sudo grep -q "location /api/" "$CONFIG_FILE"; then
    echo "   ✅ Có location /api/"
    API_LINE=$(sudo grep -n "location /api/" "$CONFIG_FILE" | head -1 | cut -d: -f1)
    echo "   Dòng: $API_LINE"
    echo "   Nội dung:"
    sudo sed -n "${API_LINE},$((API_LINE+8))p" "$CONFIG_FILE" | sed 's/^/      /'
else
    echo "   ❌ CHƯA CÓ location /api/"
    NEED_FIX=true
fi

echo ""

# Kiểm tra location /
ROOT_LINE=$(sudo grep -n "^[[:space:]]*location /[^/]" "$CONFIG_FILE" 2>/dev/null | head -1 | cut -d: -f1)
if [ -z "$ROOT_LINE" ]; then
    ROOT_LINE=$(sudo grep -n "^[[:space:]]*location / {" "$CONFIG_FILE" 2>/dev/null | head -1 | cut -d: -f1)
fi

if [ -n "$ROOT_LINE" ]; then
    echo "   ✅ Có location / ở dòng: $ROOT_LINE"
else
    echo "   ⚠️  Không tìm thấy location /"
fi

echo ""
echo "2️⃣ Kiểm tra thứ tự location blocks..."

if [ -n "$UPLOADS_LINE" ] && [ -n "$ROOT_LINE" ]; then
    if [ "$UPLOADS_LINE" -lt "$ROOT_LINE" ]; then
        echo "   ✅ location /uploads/ đứng TRƯỚC location / (ĐÚNG!)"
    else
        echo "   ❌ location /uploads/ đứng SAU location / (SAI!)"
        NEED_FIX=true
    fi
else
    if [ -z "$UPLOADS_LINE" ]; then
        echo "   ❌ Chưa có location /uploads/"
        NEED_FIX=true
    fi
fi

echo ""

if [ "$NEED_FIX" = true ]; then
    echo "3️⃣ CẦN FIX CONFIG!"
    echo ""
    echo "🚀 Chạy script fix:"
    echo "   ./api/fix-nginx-complete.sh"
    echo ""
    echo "Hoặc sửa thủ công theo docs/FIX_NGINX_MANUAL.md"
else
    echo "3️⃣ Config có vẻ đúng, nhưng vẫn trả về HTML?"
    echo ""
    echo "💡 Có thể do:"
    echo "   1. Nginx chưa reload/restart đúng cách"
    echo "   2. Cloudflare đang cache"
    echo "   3. Có nhiều location blocks duplicate"
    echo ""
    echo "🔄 Thử các bước sau:"
    echo "   1. sudo systemctl restart nginx"
    echo "   2. Clear Cloudflare cache"
    echo "   3. Test với URL mới: curl -I 'https://n8n.aidocmanageagent.io.vn/uploads/test.pdf?t=\$(date +%s)'"
    echo ""
    echo "📋 Kiểm tra xem có duplicate không:"
    echo "   sudo grep -n 'location /uploads/' $CONFIG_FILE"
    echo "   sudo grep -n 'location /api/' $CONFIG_FILE"
fi

echo ""
echo "4️⃣ Test Nginx config..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo "   ✅ Config syntax OK"
else
    echo "   ❌ Config có lỗi syntax!"
    sudo nginx -t
fi

