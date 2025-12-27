#!/bin/bash

# Tạo nginx config chỉ có HTTP block (port 80)
# Certbot sẽ tự động thêm HTTPS block khi chạy

OUTPUT_FILE="/tmp/n8n-nginx-http-only.conf"

cat > "$OUTPUT_FILE" << 'EOF'
server {
    listen 80;
    server_name n8n.aidocmanageagent.io.vn;

    # Proxy /uploads/ đến Backend
    location /uploads/ {
        proxy_pass http://localhost:5000/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Proxy /api/ đến Backend (QUAN TRỌNG: phải đứng TRƯỚC location /)
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy tất cả requests khác đến N8N
    location / {
        proxy_pass http://127.0.0.1:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

echo "✅ Đã tạo config chỉ có HTTP block: $OUTPUT_FILE"
echo ""
echo "📋 Bước tiếp theo:"
echo "   1. Backup config hiện tại:"
echo "      sudo cp /etc/nginx/sites-available/n8n /etc/nginx/sites-available/n8n.backup.\$(date +%Y%m%d_%H%M%S)"
echo ""
echo "   2. Copy config mới:"
echo "      sudo cp $OUTPUT_FILE /etc/nginx/sites-available/n8n"
echo ""
echo "   3. Test config:"
echo "      sudo nginx -t"
echo ""
echo "   4. Reload nginx:"
echo "      sudo systemctl reload nginx"
echo ""
echo "   5. Setup SSL (certbot sẽ tự động thêm HTTPS block với location /api/):"
echo "      sudo certbot --nginx -d n8n.aidocmanageagent.io.vn"

