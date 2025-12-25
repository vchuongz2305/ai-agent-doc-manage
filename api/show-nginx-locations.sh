#!/bin/bash

# Script để hiển thị location blocks cần thêm

CONFIG_FILE="/etc/nginx/sites-available/n8n"

echo "📋 Location Blocks Cần Thêm vào Nginx Config"
echo "============================================="
echo ""
echo "File: $CONFIG_FILE"
echo ""

# Tìm dòng location /
ROOT_LINE=$(sudo grep -n "^[[:space:]]*location /[^/]" "$CONFIG_FILE" 2>/dev/null | head -1 | cut -d: -f1)

if [ -z "$ROOT_LINE" ]; then
    ROOT_LINE=$(sudo grep -n "^[[:space:]]*location / {" "$CONFIG_FILE" 2>/dev/null | head -1 | cut -d: -f1)
fi

if [ -n "$ROOT_LINE" ]; then
    echo "✅ Tìm thấy 'location /' ở dòng: $ROOT_LINE"
    echo ""
    echo "📝 Thêm các block sau TRƯỚC dòng $ROOT_LINE:"
    echo ""
else
    echo "⚠️  Không tìm thấy 'location /'"
    echo "📝 Thêm các block sau vào cuối server block:"
    echo ""
fi

echo "    # Proxy /uploads/ đến Backend"
echo "    location /uploads/ {"
echo "        proxy_pass http://localhost:5000;"
echo "        proxy_http_version 1.1;"
echo "        proxy_set_header Host \$host;"
echo "        proxy_set_header X-Real-IP \$remote_addr;"
echo "        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;"
echo "        proxy_set_header X-Forwarded-Proto \$scheme;"
echo "        proxy_read_timeout 300s;"
echo "        proxy_connect_timeout 75s;"
echo "    }"
echo ""
echo "    # Proxy /api/ đến Backend"
echo "    location /api/ {"
echo "        proxy_pass http://localhost:5000;"
echo "        proxy_http_version 1.1;"
echo "        proxy_set_header Host \$host;"
echo "        proxy_set_header X-Real-IP \$remote_addr;"
echo "        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;"
echo "        proxy_set_header X-Forwarded-Proto \$scheme;"
echo "    }"
echo ""
echo "⚠️  LƯU Ý: Các location này PHẢI đứng TRƯỚC 'location /'"
echo ""
echo "🚀 Sau khi thêm:"
echo "   sudo nginx -t"
echo "   sudo systemctl restart nginx"
echo ""
echo "📋 Test:"
echo "   curl -I https://n8n.aidocmanageagent.io.vn/uploads/test.pdf"
echo "   # Should return: Content-Type: application/pdf"

