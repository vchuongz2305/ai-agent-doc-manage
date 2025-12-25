#!/bin/bash

# Script để tự động cập nhật Nginx config

CONFIG_FILE="/etc/nginx/sites-available/n8n"
BACKUP_FILE="${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"

echo "🔧 Cập nhật Nginx Config"
echo "========================"
echo ""

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ File không tồn tại: $CONFIG_FILE"
    exit 1
fi

# Backup file hiện tại
echo "1️⃣ Backup file hiện tại..."
sudo cp "$CONFIG_FILE" "$BACKUP_FILE"
echo "   ✅ Đã backup: $BACKUP_FILE"

# Kiểm tra xem đã có location /uploads/ chưa
if sudo grep -q "location /uploads/" "$CONFIG_FILE"; then
    echo "   ✅ Đã có location /uploads/"
    HAS_UPLOADS=true
else
    echo "   ❌ Chưa có location /uploads/"
    HAS_UPLOADS=false
fi

# Kiểm tra xem đã có location /api/ chưa
if sudo grep -q "location /api/" "$CONFIG_FILE"; then
    echo "   ✅ Đã có location /api/"
    HAS_API=true
else
    echo "   ❌ Chưa có location /api/"
    HAS_API=false
fi

if [ "$HAS_UPLOADS" = true ] && [ "$HAS_API" = true ]; then
    echo ""
    echo "✅ Config đã đúng, không cần cập nhật!"
    exit 0
fi

echo ""
echo "2️⃣ Tạo file config mới..."

# Tạo temp file với config mới
TEMP_FILE=$(mktemp)

# Đọc file hiện tại và thêm location blocks
sudo cat "$CONFIG_FILE" > "$TEMP_FILE"

# Tìm dòng "location /" đầu tiên
LOCATION_LINE=$(grep -n "^[[:space:]]*location /[^/]" "$TEMP_FILE" | head -1 | cut -d: -f1)

if [ -z "$LOCATION_LINE" ]; then
    echo "   ⚠️  Không tìm thấy 'location /', sẽ thêm vào cuối file"
    LOCATION_LINE=$(wc -l < "$TEMP_FILE")
fi

# Tạo config blocks cần thêm
UPLOADS_BLOCK="    # Proxy /uploads/ đến Backend
    location /uploads/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }"

API_BLOCK="    # Proxy /api/ đến Backend
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }"

# Thêm vào trước location /
if [ "$HAS_UPLOADS" = false ]; then
    echo "   ➕ Thêm location /uploads/"
    sed -i "${LOCATION_LINE}i\\${UPLOADS_BLOCK}" "$TEMP_FILE"
    LOCATION_LINE=$((LOCATION_LINE + 10))
fi

if [ "$HAS_API" = false ]; then
    echo "   ➕ Thêm location /api/"
    sed -i "${LOCATION_LINE}i\\${API_BLOCK}" "$TEMP_FILE"
fi

# Copy temp file về config file
sudo cp "$TEMP_FILE" "$CONFIG_FILE"
sudo chown root:root "$CONFIG_FILE"
sudo chmod 644 "$CONFIG_FILE"
rm "$TEMP_FILE"

echo ""
echo "3️⃣ Test Nginx config..."
if sudo nginx -t; then
    echo "   ✅ Config hợp lệ!"
    echo ""
    echo "4️⃣ Reload Nginx..."
    sudo systemctl reload nginx
    echo "   ✅ Đã reload Nginx!"
    echo ""
    echo "✅ Hoàn thành!"
    echo ""
    echo "📋 Test:"
    echo "   curl -I https://n8n.aidocmanageagent.io.vn/uploads/test.pdf"
else
    echo "   ❌ Config có lỗi!"
    echo "   💡 Khôi phục từ backup:"
    echo "      sudo cp $BACKUP_FILE $CONFIG_FILE"
    exit 1
fi

