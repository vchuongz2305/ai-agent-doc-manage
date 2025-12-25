#!/bin/bash

# Script để fix hoàn toàn Nginx config

CONFIG_FILE="/etc/nginx/sites-available/n8n"

echo "🔧 Fix Nginx Config - Complete"
echo "==============================="
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

# Xóa tất cả location /uploads/ và /api/ cũ (nếu có)
echo "2️⃣ Xóa location blocks cũ (nếu có)..."
TEMP_FILE=$(mktemp)
sudo cat "$CONFIG_FILE" > "$TEMP_FILE"

# Xóa các dòng chứa location /uploads/ và /api/ (và các dòng liên quan)
# Tìm và xóa từ "location /uploads/" đến dấu "}" tương ứng
sed -i '/location \/uploads\//,/^[[:space:]]*}/d' "$TEMP_FILE"
sed -i '/location \/api\//,/^[[:space:]]*}/d' "$TEMP_FILE"
# Xóa các dòng comment liên quan
sed -i '/# Proxy \/uploads\//d' "$TEMP_FILE"
sed -i '/# Proxy \/api\//d' "$TEMP_FILE"

echo "   ✅ Đã xóa location blocks cũ"
echo ""

# Tìm dòng location / đầu tiên
ROOT_LINE=$(grep -n "^[[:space:]]*location /[^/]" "$TEMP_FILE" | head -1 | cut -d: -f1)

if [ -z "$ROOT_LINE" ]; then
    ROOT_LINE=$(grep -n "^[[:space:]]*location / {" "$TEMP_FILE" | head -1 | cut -d: -f1)
fi

if [ -z "$ROOT_LINE" ]; then
    echo "❌ Không tìm thấy location /"
    rm "$TEMP_FILE"
    exit 1
fi

echo "3️⃣ Tìm thấy 'location /' ở dòng: $ROOT_LINE"
echo ""

# Tạo location blocks (phải là 2 block riêng biệt, không lồng nhau)
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

# Tạo file mới với location blocks được insert đúng chỗ
NEW_FILE=$(mktemp)
{
    head -n $((ROOT_LINE - 1)) "$TEMP_FILE"
    echo -n "$LOCATION_BLOCKS"
    tail -n +$ROOT_LINE "$TEMP_FILE"
} > "$NEW_FILE"

rm "$TEMP_FILE"

echo "4️⃣ Lưu config mới..."
sudo cp "$NEW_FILE" "$CONFIG_FILE"
sudo chown root:root "$CONFIG_FILE"
sudo chmod 644 "$CONFIG_FILE"
rm "$NEW_FILE"

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
        echo "   curl -I https://n8n.aidocmanageagent.io.vn/uploads/test.pdf"
        echo "   # Should return: Content-Type: application/pdf"
    else
        echo "   ❌ Lỗi khi restart Nginx"
        echo "   💡 Kiểm tra: sudo systemctl status nginx"
    fi
else
    echo "   ❌ Config có lỗi!"
    echo "   💡 Khôi phục từ backup:"
    echo "      sudo cp $BACKUP_FILE $CONFIG_FILE"
    sudo nginx -t
    exit 1
fi

