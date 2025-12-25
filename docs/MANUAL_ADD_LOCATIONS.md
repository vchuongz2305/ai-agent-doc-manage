# Hướng dẫn Thêm Location Blocks vào Nginx Config

## Vấn đề

Config chưa có `location /uploads/` và `location /api/`, nên domain vẫn trả về HTML thay vì PDF.

## Giải pháp

### Cách 1: Dùng Script Tự động (Khuyến nghị)

```bash
cd /home/danghongnguyen/Downloads/ai-agent-doc-manage
./api/add-nginx-locations.sh
```

### Cách 2: Sửa Thủ công

1. **Mở file config:**
```bash
sudo nano /etc/nginx/sites-available/n8n
```

2. **Tìm dòng `location /`** (thường có dạng):
```nginx
    location / {
        proxy_pass http://localhost:5678;  # hoặc port N8N khác
        ...
    }
```

3. **Thêm TRƯỚC dòng `location /`** (quan trọng!):
```nginx
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

    # Proxy tất cả requests khác đến N8N
    location / {
        proxy_pass http://localhost:5678;
        ...
    }
```

4. **Lưu và thoát:**
   - nano: `Ctrl+O`, `Enter`, `Ctrl+X`
   - vi: `:wq`

5. **Test và reload:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

6. **Verify:**
```bash
curl -I https://n8n.aidocmanageagent.io.vn/uploads/test.pdf
# Should return: Content-Type: application/pdf
```

## Lưu ý Quan Trọng

⚠️ **Thứ tự location blocks rất quan trọng!**

- `/uploads/` và `/api/` **PHẢI** đứng **TRƯỚC** `location /`
- Nginx match location theo thứ tự, nếu `location /` đứng trước thì sẽ match tất cả requests

## Ví dụ File Config Đúng

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name n8n.aidocmanageagent.io.vn;

    # ⚠️ QUAN TRỌNG: Các location này PHẢI đứng TRƯỚC location /
    
    location /uploads/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://localhost:5678;  # N8N
        ...
    }
}
```

## Troubleshooting

### Vẫn trả về HTML
- Kiểm tra thứ tự location blocks
- Kiểm tra có dấu `;` và `}` đúng không
- Restart Nginx: `sudo systemctl restart nginx`

### Lỗi syntax
- Kiểm tra: `sudo nginx -t`
- Xem error log: `sudo tail -f /var/log/nginx/error.log`

