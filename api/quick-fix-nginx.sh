#!/bin/bash

# Quick fix script - Kiểm tra và hướng dẫn fix Nginx

CONFIG_FILE="/etc/nginx/sites-available/n8n"

echo "🔧 Quick Fix Nginx Config"
echo "========================"
echo ""

# Kiểm tra file có tồn tại không
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ File không tồn tại: $CONFIG_FILE"
    exit 1
fi

echo "1️⃣ Kiểm tra config hiện tại..."
echo ""

# Kiểm tra location /uploads/
if sudo grep -q "location /uploads/" "$CONFIG_FILE"; then
    echo "   ✅ Đã có location /uploads/"
    HAS_UPLOADS=true
else
    echo "   ❌ Chưa có location /uploads/"
    HAS_UPLOADS=false
fi

# Kiểm tra location /api/
if sudo grep -q "location /api/" "$CONFIG_FILE"; then
    echo "   ✅ Đã có location /api/"
    HAS_API=true
else
    echo "   ❌ Chưa có location /api/"
    HAS_API=false
fi

echo ""

if [ "$HAS_UPLOADS" = false ] || [ "$HAS_API" = false ]; then
    echo "2️⃣ Cần cập nhật config!"
    echo ""
    echo "📝 Mở file để sửa:"
    echo "   sudo nano $CONFIG_FILE"
    echo ""
    echo "📋 Thêm các block sau TRƯỚC 'location /':"
    echo ""
    
    if [ "$HAS_UPLOADS" = false ]; then
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
    fi
    
    if [ "$HAS_API" = false ]; then
        echo "    location /api/ {"
        echo "        proxy_pass http://localhost:5000;"
        echo "        proxy_http_version 1.1;"
        echo "        proxy_set_header Host \$host;"
        echo "        proxy_set_header X-Real-IP \$remote_addr;"
        echo "        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;"
        echo "        proxy_set_header X-Forwarded-Proto \$scheme;"
        echo "    }"
        echo ""
    fi
    
    echo "⚠️  LƯU Ý: Các location này PHẢI đứng TRƯỚC 'location /'"
    echo ""
    echo "3️⃣ Sau khi sửa, chạy:"
    echo "   sudo nginx -t"
    echo "   sudo systemctl reload nginx"
    echo ""
    echo "4️⃣ Test:"
    echo "   curl -I https://n8n.aidocmanageagent.io.vn/uploads/test.pdf"
    echo "   # Should return: Content-Type: application/pdf"
    
else
    echo "2️⃣ Config đã đúng!"
    echo ""
    echo "⚠️  Nhưng vẫn có lỗi? Có thể cần reload Nginx:"
    echo "   sudo systemctl reload nginx"
    echo ""
    echo "Hoặc kiểm tra xem có cache không:"
    echo "   sudo systemctl restart nginx"
fi

echo ""
echo "💡 Hoặc dùng script tự động:"
echo "   ./api/update-nginx-config.sh"

