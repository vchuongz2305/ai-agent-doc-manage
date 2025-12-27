# Hướng Dẫn Nhanh: Sửa Nginx Config cho HTTPS

## Vấn Đề
API trả về HTML của n8n thay vì JSON khi gọi qua HTTPS domain.

## Giải Pháp

### Bước 1: Backup Config Hiện Tại

```bash
sudo cp /etc/nginx/sites-available/n8n /etc/nginx/sites-available/n8n.backup.$(date +%Y%m%d_%H%M%S)
```

### Bước 2: Thêm HTTPS Server Block

Mở file config:
```bash
sudo nano /etc/nginx/sites-available/n8n
```

Thêm server block HTTPS **SAU** server block HTTP hiện tại:

```nginx
# HTTPS Server Block
server {
    listen 443 ssl http2;
    server_name n8n.aidocmanageagent.io.vn;

    # SSL Configuration (sẽ được certbot tự động thêm)
    # ssl_certificate /etc/letsencrypt/live/n8n.aidocmanageagent.io.vn/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/n8n.aidocmanageagent.io.vn/privkey.pem;

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
```

**LƯU Ý QUAN TRỌNG:**
- Location `/api/` **PHẢI** đứng **TRƯỚC** location `/`
- Mỗi location là block riêng biệt, không lồng nhau

### Bước 3: Test Config

```bash
sudo nginx -t
```

Nếu OK, bạn sẽ thấy:
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Bước 4: Reload Nginx

```bash
sudo systemctl reload nginx
```

### Bước 5: Setup SSL (Nếu chưa có)

```bash
sudo certbot --nginx -d n8n.aidocmanageagent.io.vn
```

Certbot sẽ tự động:
- Tạo SSL certificate
- Cập nhật nginx config với SSL paths
- Setup auto-renewal

### Bước 6: Test API

```bash
# Test qua HTTPS
curl https://n8n.aidocmanageagent.io.vn/api/document/get-from-postgres/doc_1766741636080_ubk9wvp5u
```

Kết quả mong đợi: JSON response, không phải HTML.

## Troubleshooting

### Lỗi: "nginx: [emerg] duplicate listen options"
- Nguyên nhân: Đã có server block khác listen trên port 443
- Giải pháp: Kiểm tra file config, xóa duplicate

### Lỗi: "nginx: [emerg] bind() to 0.0.0.0:443 failed"
- Nguyên nhân: Port 443 đã được sử dụng
- Giải pháp: `sudo netstat -tlnp | grep 443` để xem process nào đang dùng

### Lỗi: SSL certificate không hợp lệ
- Giải pháp: Chạy `sudo certbot --nginx -d n8n.aidocmanageagent.io.vn`

## File Config Hoàn Chỉnh

Xem file mẫu: `api/nginx-https-config-example.conf`

