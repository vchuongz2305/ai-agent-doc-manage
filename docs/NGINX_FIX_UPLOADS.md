# Fix Nginx Config để Serve Files từ Backend

## Vấn đề

File tồn tại trên disk và có thể truy cập qua `localhost:5000`, nhưng khi truy cập qua `https://n8n.aidocmanageagent.io.vn/uploads/...` thì trả về HTML (từ N8N) thay vì file PDF.

## Nguyên nhân

Nginx đang proxy **tất cả** requests đến N8N, không có rule riêng cho `/uploads/` và `/api/` để proxy đến backend.

## Giải pháp

Cần cập nhật Nginx config để:
1. Proxy `/uploads/` → `http://localhost:5000`
2. Proxy `/api/` → `http://localhost:5000`
3. Proxy các requests khác → N8N (port 5678 hoặc port N8N đang chạy)

## Các bước

### 1. Tìm Nginx config hiện tại

```bash
# Tìm file config cho domain n8n.aidocmanageagent.io.vn
sudo find /etc/nginx -name "*n8n*" -o -name "*aidoc*" 2>/dev/null

# Hoặc kiểm tra sites-enabled
ls -la /etc/nginx/sites-enabled/
```

### 2. Cập nhật Nginx config

Mở file config (ví dụ: `/etc/nginx/sites-available/n8n` hoặc `/etc/nginx/sites-available/default`):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name n8n.aidocmanageagent.io.vn;

    # SSL config (nếu có)
    # listen 443 ssl;
    # ssl_certificate /path/to/cert.pem;
    # ssl_certificate_key /path/to/key.pem;

    # Proxy /uploads/ đến Backend (localhost:5000)
    location /uploads/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Important: Preserve original request URI
        proxy_set_header X-Original-URI $request_uri;
        
        # Timeout for large files
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Proxy /api/ đến Backend (localhost:5000)
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
        proxy_pass http://localhost:5678;  # Port của N8N (thay đổi nếu khác)
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

### 3. Test và reload Nginx

```bash
# Test config
sudo nginx -t

# Nếu OK, reload
sudo systemctl reload nginx

# Hoặc restart
sudo systemctl restart nginx
```

### 4. Kiểm tra

```bash
# Test file access
curl -I https://n8n.aidocmanageagent.io.vn/uploads/test-file.pdf

# Should return:
# HTTP/2 200
# Content-Type: application/pdf
```

## Lưu ý quan trọng

1. **Thứ tự location blocks**: `/uploads/` và `/api/` phải được định nghĩa **trước** `location /` vì Nginx match theo thứ tự.

2. **Port của N8N**: Thay `5678` bằng port thực tế N8N đang chạy (kiểm tra bằng `netstat -tlnp | grep n8n`).

3. **Backend phải chạy**: Đảm bảo backend đang chạy trên `localhost:5000`.

4. **File encoding**: Backend đã xử lý encoding cho tên file tiếng Việt, nên Nginx không cần xử lý thêm.

## Troubleshooting

### Lỗi 502 Bad Gateway
- Kiểm tra backend có đang chạy: `curl http://localhost:5000/api/document/process`
- Kiểm tra Nginx error log: `sudo tail -f /var/log/nginx/error.log`

### Lỗi 404 Not Found
- Kiểm tra path trong Nginx config có đúng không
- Kiểm tra backend route `/uploads/:fileName(*)` có hoạt động không

### Vẫn trả về HTML thay vì PDF
- Kiểm tra thứ tự location blocks (uploads phải trước /)
- Kiểm tra proxy_pass có đúng port không
- Clear browser cache và test lại

