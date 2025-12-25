#!/bin/bash

# Script để fix Nginx config thủ công (nếu script tự động không hoạt động)

CONFIG_FILE="/etc/nginx/sites-available/n8n"

echo "🔧 Fix Nginx Config - Manual Method"
echo "===================================="
echo ""

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ File không tồn tại: $CONFIG_FILE"
    exit 1
fi

# Backup
BACKUP_FILE="${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
echo "1️⃣ Backup file..."
sudo cp "$CONFIG_FILE" "$BACKUP_FILE"
echo "   ✅ Đã backup: $BACKUP_FILE"
echo ""

# Kiểm tra đã có chưa
if sudo grep -q "location /uploads/" "$CONFIG_FILE"; then
    echo "⚠️  Đã có location /uploads/, bỏ qua..."
    exit 0
fi

echo "2️⃣ Tạo file config mới với location blocks..."
echo ""

# Đọc file hiện tại
FULL_CONFIG=$(sudo cat "$CONFIG_FILE")

# Tìm dòng location /
ROOT_LINE=$(echo "$FULL_CONFIG" | grep -n "^[[:space:]]*location /[^/]" | head -1 | cut -d: -f1)

if [ -z "$ROOT_LINE" ]; then
    ROOT_LINE=$(echo "$FULL_CONFIG" | grep -n "^[[:space:]]*location / {" | head -1 | cut -d: -f1)
fi

if [ -z "$ROOT_LINE" ]; then
    echo "❌ Không tìm thấy location /"
    exit 1
fi

echo "   ✅ Tìm thấy 'location /' ở dòng: $ROOT_LINE"
echo ""

# Tạo location blocks
LOCATION_BLOCKS="    # Proxy /uploads/ đến Backend
    location /uploads/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Proxy /api/ đến Backend
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

"

# Tạo file mới
TEMP_FILE=$(mktemp)
{
    head -n $((ROOT_LINE - 1)) <(echo "$FULL_CONFIG")
    echo "$LOCATION_BLOCKS"
    tail -n +$ROOT_LINE <(echo "$FULL_CONFIG")
} > "$TEMP_FILE"

echo "3️⃣ Lưu config..."
sudo cp "$TEMP_FILE" "$CONFIG_FILE"
sudo chown root:root "$CONFIG_FILE"
sudo chmod 644 "$CONFIG_FILE"
rm "$TEMP_FILE"

echo ""
echo "4️⃣ Test Nginx config..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo "   ✅ Config hợp lệ!"
    echo ""
    echo "5️⃣ Restart Nginx..."
    sudo systemctl restart nginx
    echo "   ✅ Đã restart Nginx!"
    echo ""
    echo "✅ Hoàn thành!"
else
    echo "   ❌ Config có lỗi!"
    echo "   💡 Khôi phục từ backup:"
    echo "      sudo cp $BACKUP_FILE $CONFIG_FILE"
    sudo nginx -t
    exit 1
fi

