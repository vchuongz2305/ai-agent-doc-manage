# Fix Lỗi "Invalid PDF structure" trong N8N

## Vấn đề

Node "Extract PDF Text" trong N8N báo lỗi: **"Invalid PDF structure"**

## Nguyên nhân

Khi N8N download file từ URL `https://n8n.aidocmanageagent.io.vn/uploads/...`, nó nhận được **HTML** (trang N8N) thay vì **PDF file**, nên node "Extract PDF Text" không thể parse và báo lỗi.

### Kiểm tra

```bash
# Test download từ domain
curl -I https://n8n.aidocmanageagent.io.vn/uploads/test.pdf

# Nếu trả về:
# Content-Type: text/html; charset=utf-8
# → Đây là vấn đề!
```

## Giải pháp

Cần cấu hình Nginx để proxy `/uploads/` đến backend thay vì N8N.

### Bước 1: Tìm Nginx config

```bash
# Tìm file config
sudo find /etc/nginx -name "*n8n*" -o -name "*aidoc*" 2>/dev/null

# Hoặc
ls -la /etc/nginx/sites-enabled/
```

### Bước 2: Cập nhật Nginx config

Mở file config và thêm các location blocks sau **TRƯỚC** `location /`:

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

### Bước 3: Test và reload

```bash
# Test config
sudo nginx -t

# Nếu OK, reload
sudo systemctl reload nginx
```

### Bước 4: Verify

```bash
# Test download file
curl -I https://n8n.aidocmanageagent.io.vn/uploads/test.pdf

# Should return:
# HTTP/2 200
# Content-Type: application/pdf
```

## Lưu ý quan trọng

1. **Thứ tự location blocks**: `/uploads/` và `/api/` **PHẢI** đứng trước `location /` vì Nginx match theo thứ tự.

2. **Port của N8N**: Thay `5678` bằng port thực tế N8N đang chạy. Kiểm tra bằng:
   ```bash
   netstat -tlnp | grep n8n
   # Hoặc
   ps aux | grep n8n
   ```

3. **Backend phải chạy**: Đảm bảo backend đang chạy trên `localhost:5000`:
   ```bash
   curl http://localhost:5000/api/document/process
   ```

## Sau khi fix

1. Test lại workflow trong N8N
2. Upload file mới từ frontend
3. Kiểm tra N8N execution logs để xem file có được download đúng không

## Troubleshooting

### Vẫn trả về HTML
- Kiểm tra thứ tự location blocks
- Kiểm tra Nginx error log: `sudo tail -f /var/log/nginx/error.log`
- Clear browser cache

### Lỗi 502 Bad Gateway
- Kiểm tra backend có đang chạy: `curl http://localhost:5000/api/document/process`
- Kiểm tra port backend có đúng không

### Lỗi 404 Not Found
- Kiểm tra path trong Nginx config
- Kiểm tra backend route `/uploads/:fileName(*)` có hoạt động không

