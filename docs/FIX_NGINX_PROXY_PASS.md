# 🔧 Fix Nginx proxy_pass cho /uploads/

## Vấn đề

Backend trực tiếp trả về PDF thành công, nhưng qua Nginx bị lỗi 404 "Cannot GET /uploads/...".

## Nguyên nhân

Khi dùng `proxy_pass http://localhost:5000/uploads/;` (có trailing slash), Nginx sẽ:
- Strip `/uploads/` từ request URI
- Gửi đến backend: `http://localhost:5000/uploads/filename.pdf`

Nhưng điều này có thể gây vấn đề với cách backend route xử lý.

## Giải pháp

Thay đổi `proxy_pass` từ:
```nginx
proxy_pass http://localhost:5000/uploads/;
```

Thành:
```nginx
proxy_pass http://localhost:5000;
```

Khi không có trailing slash, Nginx sẽ giữ nguyên toàn bộ request URI khi proxy đến backend.

## Cấu hình đúng

```nginx
location /uploads/ {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
    
    # Giữ nguyên URI encoding để backend có thể decode đúng
    proxy_set_header X-Original-URI $request_uri;
}
```

## Các bước áp dụng

1. **Cập nhật Nginx config:**
   ```bash
   sudo nano /etc/nginx/sites-available/n8n
   ```
   
   Thay đổi `proxy_pass http://localhost:5000/uploads/;` thành `proxy_pass http://localhost:5000;`

2. **Kiểm tra syntax:**
   ```bash
   sudo nginx -t
   ```

3. **Reload Nginx:**
   ```bash
   sudo systemctl reload nginx
   ```

4. **Test lại:**
   ```bash
   cd api
   node test-url-encoding.js
   ```

## Kết quả mong đợi

✅ **Backend trực tiếp**: Status 200, Content-Type: application/pdf
✅ **Qua Nginx HTTP**: Status 200, Content-Type: application/pdf
✅ **Qua Nginx HTTPS**: Status 200, Content-Type: application/pdf

## Giải thích

- **Với trailing slash** (`/uploads/`): Nginx strip prefix và gửi path tương đối
- **Không có trailing slash**: Nginx giữ nguyên toàn bộ request URI

Vì backend route là `/uploads/:fileName(*)`, nó cần nhận được toàn bộ path `/uploads/filename.pdf`, nên không nên dùng trailing slash trong `proxy_pass`.

