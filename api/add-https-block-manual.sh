#!/bin/bash

# Script để thêm HTTPS block vào nginx config sau khi có SSL certificate từ DNS challenge

CONFIG_FILE="/etc/nginx/sites-available/n8n"
BACKUP_FILE="${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"

echo "🔧 Thêm HTTPS Block vào Nginx Config"
echo "====================================="
echo ""

# Kiểm tra certificate có tồn tại không
CERT_PATH="/etc/letsencrypt/live/n8n.aidocmanageagent.io.vn"
if [ ! -f "$CERT_PATH/fullchain.pem" ]; then
    echo "❌ SSL certificate không tồn tại tại: $CERT_PATH/fullchain.pem"
    echo "   Hãy chạy certbot trước:"
    echo "   sudo certbot certonly --manual --preferred-challenges dns -d n8n.aidocmanageagent.io.vn"
    exit 1
fi

echo "✅ Tìm thấy SSL certificate tại: $CERT_PATH"
echo ""

# Backup
echo "1️⃣ Backup config hiện tại..."
sudo cp "$CONFIG_FILE" "$BACKUP_FILE"
echo "   ✅ Đã backup: $BACKUP_FILE"
echo ""

# Kiểm tra đã có HTTPS block chưa
if sudo grep -q "listen 443" "$CONFIG_FILE"; then
    echo "⚠️  Đã có HTTPS block trong config!"
    read -p "   Bạn có muốn thay thế? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "   ❌ Hủy bỏ"
        exit 0
    fi
    echo "   🔄 Sẽ thay thế HTTPS block hiện có"
fi

# Tạo HTTPS block
HTTPS_BLOCK="
# HTTPS Server Block
server {
    listen 443 ssl http2;
    server_name n8n.aidocmanageagent.io.vn;

    ssl_certificate $CERT_PATH/fullchain.pem;
    ssl_certificate_key $CERT_PATH/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Allow Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files \$uri =404;
    }

    # Proxy /uploads/ đến Backend
    location /uploads/ {
        proxy_pass http://localhost:5000/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Proxy /api/ đến Backend (QUAN TRỌNG: phải đứng TRƯỚC location /)
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Proxy tất cả requests khác đến N8N
    location / {
        proxy_pass http://127.0.0.1:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
"

# Tạo temp file
TEMP_FILE=$(mktemp)
sudo cat "$CONFIG_FILE" > "$TEMP_FILE"

# Xóa HTTPS block cũ nếu có
if sudo grep -q "listen 443" "$TEMP_FILE"; then
    echo "2️⃣ Xóa HTTPS block cũ..."
    # Xóa từ "server {" với "listen 443" đến "}" tương ứng
    sudo awk '
        /^server \{/ { 
            in_server = 1
            server_start = NR
            server_lines = $0 "\n"
            brace_count = 1
            next
        }
        in_server {
            server_lines = server_lines $0 "\n"
            brace_count += gsub(/\{/, "&") - gsub(/\}/, "&")
            if (brace_count == 0) {
                if (server_lines !~ /listen 443/) {
                    printf "%s", server_lines
                }
                in_server = 0
                next
            }
            next
        }
        { print }
    ' "$TEMP_FILE" > "${TEMP_FILE}.new"
    mv "${TEMP_FILE}.new" "$TEMP_FILE"
    echo "   ✅ Đã xóa HTTPS block cũ"
fi

# Thêm HTTPS block mới
echo "3️⃣ Thêm HTTPS block mới..."
# Tìm vị trí cuối của HTTP server block
HTTP_END=$(sudo grep -n "^}" "$TEMP_FILE" | head -1 | cut -d: -f1)

if [ -z "$HTTP_END" ]; then
    echo "   ❌ Không tìm thấy HTTP server block"
    exit 1
fi

# Chèn HTTPS block sau HTTP block
sed -i "${HTTP_END}a\\${HTTPS_BLOCK}" "$TEMP_FILE"

# Copy về config file
sudo cp "$TEMP_FILE" "$CONFIG_FILE"
sudo chown root:root "$CONFIG_FILE"
sudo chmod 644 "$CONFIG_FILE"
rm "$TEMP_FILE"

echo "   ✅ Đã thêm HTTPS block"
echo ""

# Test config
echo "4️⃣ Test nginx config..."
if sudo nginx -t; then
    echo "   ✅ Config hợp lệ!"
    echo ""
    
    echo "5️⃣ Reload nginx..."
    if sudo systemctl reload nginx; then
        echo "   ✅ Đã reload nginx thành công!"
        echo ""
        echo "✅ Hoàn thành!"
        echo ""
        echo "📋 Test HTTPS API:"
        echo "   curl https://n8n.aidocmanageagent.io.vn/api/document/get-from-postgres/doc_1766741636080_ubk9wvp5u"
    else
        echo "   ❌ Reload nginx thất bại!"
        echo "   💡 Khôi phục từ backup:"
        echo "      sudo cp $BACKUP_FILE $CONFIG_FILE"
        exit 1
    fi
else
    echo "   ❌ Config có lỗi!"
    echo "   💡 Khôi phục từ backup:"
    echo "      sudo cp $BACKUP_FILE $CONFIG_FILE"
    exit 1
fi

