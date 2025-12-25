#!/bin/bash

# Script để fix Nginx config cho /uploads/ và /api/

echo "🔧 Fix Nginx Config cho Backend API"
echo "===================================="
echo ""

# Tìm Nginx config file
echo "1️⃣ Tìm Nginx config file..."
CONFIG_FILES=$(sudo find /etc/nginx -name "*n8n*" -o -name "*aidoc*" 2>/dev/null | head -1)

if [ -z "$CONFIG_FILES" ]; then
    echo "   ⚠️  Không tìm thấy config file, kiểm tra sites-enabled..."
    CONFIG_FILES=$(ls /etc/nginx/sites-enabled/* 2>/dev/null | head -1)
fi

if [ -z "$CONFIG_FILES" ]; then
    echo "   ❌ Không tìm thấy Nginx config file!"
    echo "   💡 Tạo file mới: /etc/nginx/sites-available/n8n-backend"
    CONFIG_FILE="/etc/nginx/sites-available/n8n-backend"
    CREATE_NEW=true
else
    CONFIG_FILE="$CONFIG_FILES"
    CREATE_NEW=false
    echo "   ✅ Tìm thấy: $CONFIG_FILE"
fi

echo ""
echo "2️⃣ Kiểm tra config hiện tại..."
if [ -f "$CONFIG_FILE" ]; then
    if grep -q "location /uploads/" "$CONFIG_FILE"; then
        echo "   ✅ Đã có location /uploads/"
    else
        echo "   ❌ Chưa có location /uploads/"
        NEED_UPDATE=true
    fi
    
    if grep -q "location /api/" "$CONFIG_FILE"; then
        echo "   ✅ Đã có location /api/"
    else
        echo "   ❌ Chưa có location /api/"
        NEED_UPDATE=true
    fi
else
    NEED_UPDATE=true
    echo "   ⚠️  File chưa tồn tại"
fi

echo ""
if [ "$NEED_UPDATE" = true ] || [ "$CREATE_NEW" = true ]; then
    echo "3️⃣ Cần cập nhật config..."
    echo ""
    echo "📝 Thêm vào file: $CONFIG_FILE"
    echo ""
    echo "Thêm các location blocks sau (TRƯỚC location /):"
    echo ""
    echo "    location /uploads/ {"
    echo "        proxy_pass http://localhost:5000;"
    echo "        proxy_http_version 1.1;"
    echo "        proxy_set_header Host \$host;"
    echo "        proxy_set_header X-Real-IP \$remote_addr;"
    echo "        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;"
    echo "        proxy_set_header X-Forwarded-Proto \$scheme;"
    echo "        proxy_read_timeout 300s;"
    echo "    }"
    echo ""
    echo "    location /api/ {"
    echo "        proxy_pass http://localhost:5000;"
    echo "        proxy_http_version 1.1;"
    echo "        proxy_set_header Host \$host;"
    echo "        proxy_set_header X-Real-IP \$remote_addr;"
    echo "        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;"
    echo "        proxy_set_header X-Forwarded-Proto \$scheme;"
    echo "    }"
    echo ""
    echo "⚠️  LƯU Ý: Các location blocks này PHẢI đứng TRƯỚC 'location /'"
    echo ""
    echo "Sau khi cập nhật, chạy:"
    echo "  sudo nginx -t"
    echo "  sudo systemctl reload nginx"
else
    echo "✅ Config đã đúng!"
fi

echo ""
echo "4️⃣ Test sau khi fix:"
echo "  curl -I https://n8n.aidocmanageagent.io.vn/uploads/test.pdf"
echo "  # Should return: Content-Type: application/pdf"

