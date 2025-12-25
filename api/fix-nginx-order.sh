#!/bin/bash

# Script để sửa thứ tự location blocks - đảm bảo /uploads/ và /api/ đứng đầu

CONFIG_FILE="/etc/nginx/sites-available/n8n"

echo "🔧 Fix Nginx Location Order"
echo "============================"
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

# Đọc toàn bộ config
FULL_CONFIG=$(sudo cat "$CONFIG_FILE")

# Tìm tất cả location / (không phải /uploads/ hay /api/)
ALL_LOCATION_LINES=$(echo "$FULL_CONFIG" | grep -n "^[[:space:]]*location /[^/]" | cut -d: -f1)
FIRST_LOCATION_LINE=$(echo "$ALL_LOCATION_LINES" | head -1)

if [ -z "$FIRST_LOCATION_LINE" ]; then
    ALL_LOCATION_LINES=$(echo "$FULL_CONFIG" | grep -n "^[[:space:]]*location / {" | cut -d: -f1)
    FIRST_LOCATION_LINE=$(echo "$ALL_LOCATION_LINES" | head -1)
fi

if [ -z "$FIRST_LOCATION_LINE" ]; then
    echo "❌ Không tìm thấy location /"
    exit 1
fi

echo "2️⃣ Tìm thấy location / đầu tiên ở dòng: $FIRST_LOCATION_LINE"
echo ""

# Kiểm tra xem đã có location /uploads/ và /api/ chưa
HAS_UPLOADS=$(echo "$FULL_CONFIG" | grep -q "location /uploads/" && echo "yes" || echo "no")
HAS_API=$(echo "$FULL_CONFIG" | grep -q "location /api/" && echo "yes" || echo "no")

# Tạo file mới
TEMP_FILE=$(mktemp)

# Lấy phần trước location / đầu tiên
HEAD_PART=$(echo "$FULL_CONFIG" | head -n $((FIRST_LOCATION_LINE - 1)))

# Location blocks cần thêm
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

# Xóa location /uploads/ và /api/ cũ nếu có
CLEANED_CONFIG=$(echo "$FULL_CONFIG" | sed '/location \/uploads\//,/^[[:space:]]*}/d' | sed '/location \/api\//,/^[[:space:]]*}/d' | sed '/# Proxy \/uploads\//d' | sed '/# Proxy \/api\//d')

# Tìm lại location / đầu tiên sau khi xóa
NEW_FIRST_LOCATION_LINE=$(echo "$CLEANED_CONFIG" | grep -n "^[[:space:]]*location /[^/]" | head -1 | cut -d: -f1)
if [ -z "$NEW_FIRST_LOCATION_LINE" ]; then
    NEW_FIRST_LOCATION_LINE=$(echo "$CLEANED_CONFIG" | grep -n "^[[:space:]]*location / {" | head -1 | cut -d: -f1)
fi

# Tạo file mới
{
    echo "$CLEANED_CONFIG" | head -n $((NEW_FIRST_LOCATION_LINE - 1))
    echo -n "$LOCATION_BLOCKS"
    echo "$CLEANED_CONFIG" | tail -n +$NEW_FIRST_LOCATION_LINE
} > "$TEMP_FILE"

echo "3️⃣ Đã tạo config mới với location blocks ở đầu"
echo ""

echo "4️⃣ Lưu config..."
sudo cp "$TEMP_FILE" "$CONFIG_FILE"
sudo chown root:root "$CONFIG_FILE"
sudo chmod 644 "$CONFIG_FILE"
rm "$TEMP_FILE"

echo ""
echo "5️⃣ Test Nginx config..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo "   ✅ Config hợp lệ!"
    echo ""
    echo "6️⃣ Restart Nginx..."
    sudo systemctl restart nginx
    if [ $? -eq 0 ]; then
        echo "   ✅ Đã restart Nginx!"
        echo ""
        echo "✅ Hoàn thành!"
        echo ""
        echo "📋 Test:"
        echo "   curl -I 'https://n8n.aidocmanageagent.io.vn/uploads/test.pdf?t=\$(date +%s)'"
        echo "   # Should return: Content-Type: application/pdf"
    else
        echo "   ❌ Lỗi khi restart Nginx"
    fi
else
    echo "   ❌ Config có lỗi!"
    echo "   💡 Khôi phục từ backup:"
    echo "      sudo cp $BACKUP_FILE $CONFIG_FILE"
    sudo nginx -t
    exit 1
fi

