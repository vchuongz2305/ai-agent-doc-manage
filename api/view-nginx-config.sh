#!/bin/bash

# Script để xem Nginx config

CONFIG_FILE="/etc/nginx/sites-available/n8n"

echo "📋 Nginx Config File: $CONFIG_FILE"
echo "===================================="
echo ""

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ File không tồn tại!"
    exit 1
fi

echo "📄 Toàn bộ nội dung file:"
echo ""
sudo cat "$CONFIG_FILE"
echo ""
echo "===================================="
echo ""

echo "🔍 Kiểm tra location blocks:"
echo ""

# Kiểm tra location /uploads/
if sudo grep -q "location /uploads/" "$CONFIG_FILE"; then
    echo "✅ Có location /uploads/"
    echo "   Nội dung:"
    sudo grep -A 10 "location /uploads/" "$CONFIG_FILE" | sed 's/^/   /'
else
    echo "❌ CHƯA CÓ location /uploads/"
fi

echo ""

# Kiểm tra location /api/
if sudo grep -q "location /api/" "$CONFIG_FILE"; then
    echo "✅ Có location /api/"
    echo "   Nội dung:"
    sudo grep -A 10 "location /api/" "$CONFIG_FILE" | sed 's/^/   /'
else
    echo "❌ CHƯA CÓ location /api/"
fi

echo ""

# Kiểm tra location /
ROOT_LINE=$(sudo grep -n "^[[:space:]]*location /[^/]" "$CONFIG_FILE" 2>/dev/null | head -1 | cut -d: -f1)
if [ -n "$ROOT_LINE" ]; then
    echo "✅ Có location / ở dòng: $ROOT_LINE"
    echo "   Nội dung:"
    sudo sed -n "${ROOT_LINE},$((ROOT_LINE+5))p" "$CONFIG_FILE" | sed 's/^/   /'
else
    ROOT_LINE=$(sudo grep -n "^[[:space:]]*location / {" "$CONFIG_FILE" 2>/dev/null | head -1 | cut -d: -f1)
    if [ -n "$ROOT_LINE" ]; then
        echo "✅ Có location / { ở dòng: $ROOT_LINE"
        echo "   Nội dung:"
        sudo sed -n "${ROOT_LINE},$((ROOT_LINE+5))p" "$CONFIG_FILE" | sed 's/^/   /'
    else
        echo "⚠️  Không tìm thấy location /"
    fi
fi

echo ""
echo "===================================="
echo ""

# Kiểm tra thứ tự
UPLOADS_LINE=$(sudo grep -n "location /uploads/" "$CONFIG_FILE" 2>/dev/null | cut -d: -f1)
API_LINE=$(sudo grep -n "location /api/" "$CONFIG_FILE" 2>/dev/null | cut -d: -f1)
ROOT_LINE=$(sudo grep -n "^[[:space:]]*location /[^/]" "$CONFIG_FILE" 2>/dev/null | head -1 | cut -d: -f1)

if [ -z "$ROOT_LINE" ]; then
    ROOT_LINE=$(sudo grep -n "^[[:space:]]*location / {" "$CONFIG_FILE" 2>/dev/null | head -1 | cut -d: -f1)
fi

echo "📊 Thứ tự location blocks:"
if [ -n "$UPLOADS_LINE" ] && [ -n "$ROOT_LINE" ]; then
    if [ "$UPLOADS_LINE" -lt "$ROOT_LINE" ]; then
        echo "   ✅ location /uploads/ đứng TRƯỚC location / (ĐÚNG!)"
    else
        echo "   ❌ location /uploads/ đứng SAU location / (SAI!)"
    fi
    echo "   /uploads/ ở dòng: $UPLOADS_LINE"
    echo "   / ở dòng: $ROOT_LINE"
else
    if [ -z "$UPLOADS_LINE" ]; then
        echo "   ❌ Chưa có location /uploads/"
    fi
    if [ -z "$ROOT_LINE" ]; then
        echo "   ⚠️  Không tìm thấy location /"
    fi
fi

echo ""
echo "💡 Nếu chưa có location blocks, chạy:"
echo "   ./api/add-nginx-locations.sh"

