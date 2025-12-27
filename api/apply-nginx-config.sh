#!/bin/bash

# Script để apply nginx config và setup cho certbot

echo "🔧 Apply Nginx Config và Setup Certbot"
echo "======================================"
echo ""

CONFIG_FILE="/etc/nginx/sites-available/n8n"
NEW_CONFIG="/tmp/n8n-nginx-http-only.conf"

# Kiểm tra file config mới
if [ ! -f "$NEW_CONFIG" ]; then
    echo "❌ File config mới không tồn tại: $NEW_CONFIG"
    echo "   Chạy: ./api/create-nginx-http-only.sh"
    exit 1
fi

echo "1️⃣ Backup config hiện tại..."
sudo cp "$CONFIG_FILE" "${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
echo "   ✅ Đã backup"
echo ""

echo "2️⃣ Copy config mới..."
sudo cp "$NEW_CONFIG" "$CONFIG_FILE"
echo "   ✅ Đã copy config mới"
echo ""

echo "3️⃣ Test nginx config..."
if sudo nginx -t; then
    echo "   ✅ Config hợp lệ!"
    echo ""
    
    echo "4️⃣ Reload nginx..."
    if sudo systemctl reload nginx; then
        echo "   ✅ Đã reload nginx thành công!"
        echo ""
        
        echo "5️⃣ Tạo thư mục cho certbot..."
        sudo mkdir -p /var/www/html/.well-known/acme-challenge
        sudo chown -R www-data:www-data /var/www/html
        sudo chmod -R 755 /var/www/html
        echo "   ✅ Đã tạo thư mục"
        echo ""
        
        echo "✅ Hoàn thành!"
        echo ""
        echo "📋 Bước tiếp theo:"
        echo ""
        echo "⚠️  QUAN TRỌNG: Nếu domain đang dùng Cloudflare proxy (orange cloud):"
        echo "   1. Vào Cloudflare Dashboard"
        echo "   2. DNS → Tìm record n8n.aidocmanageagent.io.vn"
        echo "   3. Tắt proxy (click cloud icon để chuyển sang gray)"
        echo "   4. Chờ 2-3 phút"
        echo ""
        echo "Sau đó chạy:"
        echo "   sudo certbot --nginx -d n8n.aidocmanageagent.io.vn"
        echo ""
        echo "Certbot sẽ tự động:"
        echo "   - Verify domain"
        echo "   - Tạo SSL certificate"
        echo "   - Thêm HTTPS server block với location /api/"
        echo "   - Reload nginx"
    else
        echo "   ❌ Reload nginx thất bại!"
        exit 1
    fi
else
    echo "   ❌ Config có lỗi!"
    exit 1
fi

