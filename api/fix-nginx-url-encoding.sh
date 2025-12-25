#!/bin/bash

# Script để fix Nginx config cho URL encoding với ký tự đặc biệt

CONFIG_FILE="/etc/nginx/sites-available/n8n"

echo "🔧 Fix Nginx config cho URL encoding..."
echo ""

# Kiểm tra file config
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Không tìm thấy file config: $CONFIG_FILE"
    exit 1
fi

echo "✅ File config: $CONFIG_FILE"
echo ""

# Kiểm tra syntax
echo "📋 Kiểm tra Nginx config syntax..."
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo "   ✅ Nginx config syntax OK"
else
    echo "   ❌ Nginx config có lỗi!"
    sudo nginx -t
    exit 1
fi

echo ""
echo "🔄 Reload Nginx..."
sudo systemctl reload nginx

if [ $? -eq 0 ]; then
    echo "   ✅ Nginx đã được reload thành công!"
else
    echo "   ❌ Lỗi khi reload Nginx"
    exit 1
fi

echo ""
echo "🧪 Test URL encoding..."
echo "   File test: 1764665251723-Thông_tin_Trần_hà_Duy.pdf"
echo "   Encoded: 1764665251723-Th%C3%B4ng_tin_Tr%E1%BA%A7n_h%C3%A0_Duy.pdf"
echo ""
echo "   Test URL:"
echo "   curl -I 'https://n8n.aidocmanageagent.io.vn/uploads/1764665251723-Th%C3%B4ng_tin_Tr%E1%BA%A7n_h%C3%A0_Duy.pdf'"
echo ""
echo "✅ Hoàn tất! Nginx đã được cấu hình để xử lý URL encoding đúng cách."

