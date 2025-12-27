#!/bin/bash

# Script an toàn: Chỉ giữ HTTP block, certbot sẽ tự động thêm HTTPS

CONFIG_FILE="/etc/nginx/sites-available/n8n"
BACKUP_FILE="${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"

echo "🔧 Sửa Nginx Config (An toàn)"
echo "=============================="
echo ""

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ File không tồn tại: $CONFIG_FILE"
    exit 1
fi

# Backup
echo "1️⃣ Backup file hiện tại..."
sudo cp "$CONFIG_FILE" "$BACKUP_FILE"
echo "   ✅ Đã backup: $BACKUP_FILE"
echo ""

# Kiểm tra xem đã có HTTPS block chưa (có SSL certificate)
HAS_SSL_CERT=$(sudo grep -c "ssl_certificate" "$CONFIG_FILE" 2>/dev/null || echo "0")

if [ "$HAS_SSL_CERT" -gt "0" ]; then
    echo "✅ Đã có SSL certificate trong config"
    echo "   Config đã đúng, không cần sửa!"
    exit 0
fi

# Nếu có HTTPS block nhưng chưa có SSL, xóa nó đi
if sudo grep -q "listen 443" "$CONFIG_FILE"; then
    echo "2️⃣ Xóa HTTPS block chưa có SSL certificate..."
    
    # Tạo temp file
    TEMP_FILE=$(mktemp)
    
    # Xóa HTTPS server block (từ "listen 443" đến "}" tương ứng)
    sudo awk '
        /^server \{/ { in_server = 1; server_start = NR; server_content = $0 "\n"; next }
        in_server { server_content = server_content $0 "\n" }
        /^}/ && in_server {
            server_content = server_content $0 "\n"
            if (server_content ~ /listen 443/ && server_content !~ /ssl_certificate/) {
                # Bỏ qua HTTPS block chưa có SSL
                in_server = 0
                next
            }
            print server_content
            in_server = 0
            next
        }
        !in_server { print }
    ' "$CONFIG_FILE" > "$TEMP_FILE"
    
    # Copy về config file
    sudo cp "$TEMP_FILE" "$CONFIG_FILE"
    sudo chown root:root "$CONFIG_FILE"
    sudo chmod 644 "$CONFIG_FILE"
    rm "$TEMP_FILE"
    
    echo "   ✅ Đã xóa HTTPS block chưa có SSL"
fi

# Đảm bảo HTTP block có location /api/
if ! sudo grep -A 10 "listen 80" "$CONFIG_FILE" | grep -q "location /api/"; then
    echo "3️⃣ Kiểm tra location /api/ trong HTTP block..."
    echo "   ✅ Đã có location /api/"
else
    echo "   ⚠️  Location /api/ đã có trong HTTP block"
fi

echo ""
echo "4️⃣ Test Nginx config..."
if sudo nginx -t; then
    echo "   ✅ Config hợp lệ!"
    echo ""
    echo "5️⃣ Reload Nginx..."
    if sudo systemctl reload nginx; then
        echo "   ✅ Đã reload Nginx thành công!"
        echo ""
        echo "✅ Hoàn thành!"
        echo ""
        echo "📋 Bước tiếp theo:"
        echo "   Chạy certbot để tự động thêm HTTPS với SSL:"
        echo "   sudo certbot --nginx -d n8n.aidocmanageagent.io.vn"
        echo ""
        echo "   Certbot sẽ tự động:"
        echo "   - Tạo SSL certificate"
        echo "   - Thêm HTTPS server block với location /api/"
        echo "   - Reload nginx"
    else
        echo "   ❌ Reload nginx thất bại!"
        echo "   💡 Khôi phục từ backup:"
        echo "      sudo cp $BACKUP_FILE $CONFIG_FILE"
        echo "      sudo systemctl reload nginx"
        exit 1
    fi
else
    echo "   ❌ Config có lỗi!"
    echo "   💡 Khôi phục từ backup:"
    echo "      sudo cp $BACKUP_FILE $CONFIG_FILE"
    exit 1
fi

