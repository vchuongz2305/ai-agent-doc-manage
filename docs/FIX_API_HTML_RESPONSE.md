# Sửa Lỗi API Trả Về HTML Thay Vì JSON

## Vấn Đề

Khi gọi API endpoint:
```
GET https://n8n.aidocmanageagent.io.vn/api/document/get-from-postgres/doc_1766741636080_ubk9wvp5u
```

API trả về HTML của n8n Editor-UI thay vì JSON data.

## Nguyên Nhân

1. **Backend server đang chạy code cũ**: Route `/api/document/get-from-postgres/:processingId` chưa được load vào server đang chạy
2. **Nginx thiếu cấu hình HTTPS**: Nginx chỉ có config cho HTTP (port 80), nhưng domain đang dùng HTTPS (port 443)

## Giải Pháp

### Bước 1: Restart Backend Server

Backend server cần được restart để load route mới:

```bash
# Tìm process ID của backend server
ps aux | grep "unified-document-agent"

# Kill process cũ (thay PID bằng process ID thực tế)
kill <PID>

# Hoặc nếu đang chạy trong terminal, nhấn Ctrl+C và chạy lại:
cd /home/danghongnguyen/Downloads/ai-agent-doc-manage
node api/unified-document-agent.js
```

### Bước 2: Sửa Nginx Config cho HTTPS

Chạy script tự động để thêm cấu hình HTTPS:

```bash
cd /home/danghongnguyen/Downloads/ai-agent-doc-manage
./api/fix-nginx-https.sh
```

Script sẽ:
- ✅ Backup file config hiện tại
- ✅ Thêm server block cho HTTPS (port 443) nếu chưa có
- ✅ Đảm bảo location `/api/` route đến backend (port 5000)
- ✅ Test và reload nginx

### Bước 3: Setup SSL Certificate (Nếu chưa có)

Nếu chưa có SSL certificate, chạy:

```bash
sudo certbot --nginx -d n8n.aidocmanageagent.io.vn
```

Certbot sẽ tự động:
- Tạo SSL certificate
- Cập nhật nginx config với SSL paths
- Setup auto-renewal

### Bước 4: Test API

Sau khi hoàn thành, test API:

```bash
# Test trực tiếp backend
curl http://localhost:5000/api/document/get-from-postgres/doc_1766741636080_ubk9wvp5u

# Test qua nginx HTTPS
curl https://n8n.aidocmanageagent.io.vn/api/document/get-from-postgres/doc_1766741636080_ubk9wvp5u
```

Kết quả mong đợi:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "processing_id": "doc_1766741636080_ubk9wvp5u",
    "file_name": "...",
    ...
  }
}
```

## Kiểm Tra Thủ Công

### 1. Kiểm tra Backend Route

```bash
# Test route có được đăng ký không
curl http://localhost:5000/api/document/get-from-postgres/test_id
```

Nếu trả về "Cannot GET", backend cần restart.

### 2. Kiểm tra Nginx Config

```bash
# Xem config hiện tại
sudo cat /etc/nginx/sites-available/n8n

# Test config
sudo nginx -t

# Xem nginx logs nếu có lỗi
sudo tail -f /var/log/nginx/error.log
```

### 3. Kiểm tra Location Blocks

Đảm bảo trong nginx config có:

```nginx
server {
    listen 443 ssl http2;
    server_name n8n.aidocmanageagent.io.vn;

    # ... SSL config ...

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
        ...
    }
}
```

## Troubleshooting

### Lỗi: "Cannot GET /api/document/get-from-postgres/..."

**Nguyên nhân**: Backend server chưa load route mới

**Giải pháp**: Restart backend server

### Lỗi: Trả về HTML của n8n

**Nguyên nhân**: Nginx route `/api/` đến n8n thay vì backend

**Giải pháp**: 
1. Kiểm tra nginx config có location `/api/` route đến `http://localhost:5000` không
2. Đảm bảo location `/api/` đứng TRƯỚC location `/`
3. Reload nginx: `sudo systemctl reload nginx`

### Lỗi: 502 Bad Gateway

**Nguyên nhân**: Backend server không chạy hoặc không accessible

**Giải pháp**:
1. Kiểm tra backend có đang chạy: `ps aux | grep unified-document-agent`
2. Kiểm tra backend có listen trên port 5000: `netstat -tlnp | grep 5000`
3. Test backend trực tiếp: `curl http://localhost:5000/api/document/process`

### Lỗi: SSL Certificate không hợp lệ

**Nguyên nhân**: Chưa setup SSL hoặc certificate đã hết hạn

**Giải pháp**:
1. Setup SSL: `sudo certbot --nginx -d n8n.aidocmanageagent.io.vn`
2. Renew certificate: `sudo certbot renew`

## Lưu Ý

1. **Thứ tự location blocks**: Location `/api/` PHẢI đứng TRƯỚC location `/` trong nginx config
2. **Backend restart**: Mỗi khi thêm route mới, cần restart backend server
3. **Nginx reload**: Sau khi sửa nginx config, cần reload: `sudo systemctl reload nginx`
4. **Test trước khi deploy**: Luôn test backend trực tiếp trước khi test qua nginx

