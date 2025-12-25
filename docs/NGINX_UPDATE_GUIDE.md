# Hướng dẫn Cập nhật Nginx Config

## File cần sửa

**File:** `/etc/nginx/sites-available/n8n`

Đây là file thực tế. File `/etc/nginx/sites-enabled/n8n` chỉ là symlink đến file này.

## Cách 1: Dùng Script Tự động (Khuyến nghị)

```bash
cd /home/danghongnguyen/Downloads/ai-agent-doc-manage

# Chạy script tự động
./api/update-nginx-config.sh
```

Script sẽ:
- ✅ Backup file hiện tại
- ✅ Tự động thêm location blocks nếu chưa có
- ✅ Test config
- ✅ Reload Nginx

## Cách 2: Sửa Thủ công

### Bước 1: Mở file

```bash
sudo nano /etc/nginx/sites-available/n8n
# Hoặc
sudo vi /etc/nginx/sites-available/n8n
```

### Bước 2: Tìm dòng `location /`

Tìm dòng có dạng:
```nginx
    location / {
        proxy_pass http://localhost:5678;  # hoặc port N8N khác
        ...
    }
```

### Bước 3: Thêm location blocks TRƯỚC `location /`

Thêm các block sau **TRƯỚC** dòng `location /`:

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
        proxy_pass http://localhost:5678;  # Port của N8N
        ...
    }
```

### Bước 4: Lưu và thoát

- **nano**: `Ctrl+O` (lưu), `Enter` (xác nhận), `Ctrl+X` (thoát)
- **vi**: `:wq` (lưu và thoát)

### Bước 5: Test và reload

```bash
# Test config
sudo nginx -t

# Nếu OK, reload
sudo systemctl reload nginx
```

## Cách 3: Đọc Config Trước

Nếu muốn xem config hiện tại trước:

```bash
cd /home/danghongnguyen/Downloads/ai-agent-doc-manage
./api/read-nginx-config.sh
```

## Ví dụ File Config Hoàn Chỉnh

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name n8n.aidocmanageagent.io.vn;

    # SSL (nếu có)
    # listen 443 ssl;
    # ssl_certificate /path/to/cert.pem;
    # ssl_certificate_key /path/to/key.pem;

    # ⚠️ QUAN TRỌNG: Các location này PHẢI đứng TRƯỚC location /
    
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
        proxy_pass http://localhost:5678;  # Port của N8N
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

## Lưu ý Quan Trọng

1. **Thứ tự location blocks**: `/uploads/` và `/api/` **PHẢI** đứng trước `location /`
2. **Port N8N**: Thay `5678` bằng port thực tế N8N đang chạy
3. **Backend phải chạy**: Đảm bảo backend đang chạy trên `localhost:5000`

## Kiểm tra Sau Khi Cập Nhật

```bash
# Test download file
curl -I https://n8n.aidocmanageagent.io.vn/uploads/test.pdf

# Should return:
# HTTP/2 200
# Content-Type: application/pdf
```

## Troubleshooting

### Lỗi "nginx: configuration file test failed"
- Kiểm tra syntax trong file config
- Kiểm tra có thiếu dấu `;` hoặc `}` không

### Vẫn trả về HTML
- Kiểm tra thứ tự location blocks
- Kiểm tra Nginx error log: `sudo tail -f /var/log/nginx/error.log`

### Lỗi 502 Bad Gateway
- Kiểm tra backend có đang chạy: `curl http://localhost:5000/api/document/process`
- Kiểm tra port backend có đúng không

