#!/bin/bash

# Script để sửa Nginx config cho HTTPS và đảm bảo /api/ route đến backend

CONFIG_FILE="/etc/nginx/sites-available/n8n"
BACKUP_FILE="${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"

echo "🔧 Sửa Nginx Config cho HTTPS"
echo "============================="
echo ""

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ File không tồn tại: $CONFIG_FILE"
    exit 1
fi

# Backup file hiện tại
echo "1️⃣ Backup file hiện tại..."
sudo cp "$CONFIG_FILE" "$BACKUP_FILE"
echo "   ✅ Đã backup: $BACKUP_FILE"
echo ""

# Kiểm tra xem có server block cho HTTPS (port 443) chưa
HAS_HTTPS=$(sudo grep -c "listen 443" "$CONFIG_FILE" 2>/dev/null || echo "0")

if [ "$HAS_HTTPS" -eq "0" ]; then
    echo "2️⃣ Thêm server block cho HTTPS..."
    
    # Tạo temp file
    TEMP_FILE=$(mktemp)
    sudo cat "$CONFIG_FILE" > "$TEMP_FILE"
    
    # Tìm dòng cuối cùng của server block HTTP
    HTTP_SERVER_END=$(sudo grep -n "^}" "$CONFIG_FILE" | tail -1 | cut -d: -f1)
    
    if [ -z "$HTTP_SERVER_END" ]; then
        echo "   ❌ Không tìm thấy server block HTTP"
        exit 1
    fi
    
    # Tạo HTTPS server block
    HTTPS_BLOCK="
# HTTPS Server Block
server {
    listen 443 ssl http2;
    server_name n8n.aidocmanageagent.io.vn;

    # SSL Configuration (sẽ được certbot cập nhật)
    # ssl_certificate /etc/letsencrypt/live/n8n.aidocmanageagent.io.vn/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/n8n.aidocmanageagent.io.vn/privkey.pem;
    
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

    # Proxy /api/ đến Backend
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
    
    # Thêm HTTPS block sau HTTP block
    sed -i "${HTTP_SERVER_END}a\\${HTTPS_BLOCK}" "$TEMP_FILE"
    
    # Copy về config file
    sudo cp "$TEMP_FILE" "$CONFIG_FILE"
    sudo chown root:root "$CONFIG_FILE"
    sudo chmod 644 "$CONFIG_FILE"
    rm "$TEMP_FILE"
    
    echo "   ✅ Đã thêm server block cho HTTPS"
    echo ""
    echo "   ⚠️  LƯU Ý: Bạn cần chạy certbot để setup SSL:"
    echo "      sudo certbot --nginx -d n8n.aidocmanageagent.io.vn"
    echo ""
else
    echo "2️⃣ Đã có server block HTTPS, kiểm tra location /api/..."
    
    # Kiểm tra xem HTTPS server block có location /api/ chưa
    HTTPS_HAS_API=$(sudo awk '/listen 443/,/^}/ {if (/location \/api\//) found=1} END {print found+0}' "$CONFIG_FILE")
    
    if [ "$HTTPS_HAS_API" -eq "0" ]; then
        echo "   ❌ HTTPS server block chưa có location /api/"
        echo "   🔧 Thêm location /api/ vào HTTPS server block..."
        
        # Tạo temp file
        TEMP_FILE=$(mktemp)
        sudo cat "$CONFIG_FILE" > "$TEMP_FILE"
        
        # Tìm dòng "location /" trong HTTPS server block (sau "listen 443")
        HTTPS_LOCATION_LINE=$(sudo awk '/listen 443/,/^}/ {if (/^[[:space:]]*location \/[^\/]/) {print NR; exit}}' "$CONFIG_FILE")
        
        if [ -z "$HTTPS_LOCATION_LINE" ]; then
            echo "   ❌ Không tìm thấy location / trong HTTPS server block"
            exit 1
        fi
        
        # Tạo API location block
        API_BLOCK="    # Proxy /api/ đến Backend
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

"
        
        # Thêm API block trước location /
        sed -i "${HTTPS_LOCATION_LINE}i\\${API_BLOCK}" "$TEMP_FILE"
        
        # Copy về config file
        sudo cp "$TEMP_FILE" "$CONFIG_FILE"
        sudo chown root:root "$CONFIG_FILE"
        sudo chmod 644 "$CONFIG_FILE"
        rm "$TEMP_FILE"
        
        echo "   ✅ Đã thêm location /api/ vào HTTPS server block"
    else
        echo "   ✅ HTTPS server block đã có location /api/"
    fi
fi

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
    echo "📋 Test API endpoint:"
    echo "   curl https://n8n.aidocmanageagent.io.vn/api/document/get-from-postgres/doc_1766741636080_ubk9wvp5u"
else
    echo "   ❌ Config có lỗi!"
    echo "   💡 Khôi phục từ backup:"
    echo "      sudo cp $BACKUP_FILE $CONFIG_FILE"
    exit 1
fi

