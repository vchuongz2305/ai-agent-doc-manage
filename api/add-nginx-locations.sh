#!/bin/bash

# Script để thêm location blocks vào Nginx config

CONFIG_FILE="/etc/nginx/sites-available/n8n"
BACKUP_FILE="${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"

echo "🔧 Thêm location blocks vào Nginx config"
echo "========================================"
echo ""

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ File không tồn tại: $CONFIG_FILE"
    exit 1
fi

# Backup
echo "1️⃣ Backup file..."
sudo cp "$CONFIG_FILE" "$BACKUP_FILE"
echo "   ✅ Đã backup: $BACKUP_FILE"
echo ""

# Tìm dòng location / đầu tiên
echo "2️⃣ Tìm vị trí để thêm location blocks..."
LOCATION_LINE=$(sudo grep -n "^[[:space:]]*location /[^/]" "$CONFIG_FILE" | head -1 | cut -d: -f1)

if [ -z "$LOCATION_LINE" ]; then
    echo "   ⚠️  Không tìm thấy 'location /', tìm 'location / {'"
    LOCATION_LINE=$(sudo grep -n "^[[:space:]]*location / {" "$CONFIG_FILE" | head -1 | cut -d: -f1)
fi

if [ -z "$LOCATION_LINE" ]; then
    echo "   ❌ Không tìm thấy location / trong config!"
    echo "   💡 Cần thêm thủ công vào file"
    exit 1
fi

echo "   ✅ Tìm thấy 'location /' ở dòng: $LOCATION_LINE"
echo ""

# Tạo location blocks
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

# Kiểm tra xem đã có location blocks chưa
if sudo grep -q "location /uploads/" "$CONFIG_FILE"; then
    echo "   ⚠️  Đã có location /uploads/, bỏ qua..."
    exit 0
fi

# Tạo temp file
TEMP_FILE=$(mktemp)
sudo cat "$CONFIG_FILE" > "$TEMP_FILE"

# Tạo file chứa location blocks (phải là 2 location riêng biệt, không lồng nhau)
BLOCKS_FILE=$(mktemp)
cat > "$BLOCKS_FILE" << 'EOF'
    # Proxy /uploads/ đến Backend
    location /uploads/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Proxy /api/ đến Backend
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

EOF

# Thêm location blocks trước location / (dùng sed với r command)
echo "3️⃣ Thêm location /uploads/ và /api/..."
# sed r command insert file content before the line
sed -i "${LOCATION_LINE}r $BLOCKS_FILE" "$TEMP_FILE"
rm "$BLOCKS_FILE"

# Copy về config file
echo "5️⃣ Lưu config..."
sudo cp "$TEMP_FILE" "$CONFIG_FILE"
sudo chown root:root "$CONFIG_FILE"
sudo chmod 644 "$CONFIG_FILE"
rm "$TEMP_FILE"

echo ""
echo "6️⃣ Test Nginx config..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo "   ✅ Config hợp lệ!"
    echo ""
    echo "7️⃣ Reload Nginx..."
    sudo systemctl reload nginx
    echo "   ✅ Đã reload Nginx!"
    echo ""
    echo "✅ Hoàn thành!"
    echo ""
    echo "📋 Test:"
    echo "   curl -I https://n8n.aidocmanageagent.io.vn/uploads/test.pdf"
    echo "   # Should return: Content-Type: application/pdf"
else
    echo "   ❌ Config có lỗi!"
    echo "   💡 Khôi phục từ backup:"
    echo "      sudo cp $BACKUP_FILE $CONFIG_FILE"
    sudo nginx -t
    exit 1
fi

