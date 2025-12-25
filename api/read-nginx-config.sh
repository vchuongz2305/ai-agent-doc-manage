#!/bin/bash

# Script để đọc và cập nhật Nginx config

CONFIG_FILE="/etc/nginx/sites-available/n8n"

echo "📁 File Nginx config: $CONFIG_FILE"
echo ""

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ File không tồn tại!"
    exit 1
fi

echo "📋 Nội dung file hiện tại:"
echo "=================================="
sudo cat "$CONFIG_FILE"
echo ""
echo "=================================="
echo ""

# Kiểm tra xem đã có location /uploads/ chưa
if sudo grep -q "location /uploads/" "$CONFIG_FILE"; then
    echo "✅ Đã có location /uploads/"
else
    echo "❌ Chưa có location /uploads/"
fi

# Kiểm tra xem đã có location /api/ chưa
if sudo grep -q "location /api/" "$CONFIG_FILE"; then
    echo "✅ Đã có location /api/"
else
    echo "❌ Chưa có location /api/"
fi

echo ""
echo "💡 Để cập nhật, chạy:"
echo "   sudo nano $CONFIG_FILE"
echo "   # Hoặc"
echo "   sudo vi $CONFIG_FILE"

