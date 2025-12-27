# Sửa Lỗi Nginx: SSL Certificate Not Defined

## Vấn Đề

Khi thêm HTTPS server block vào nginx config mà chưa có SSL certificate, nginx sẽ báo lỗi:

```
[emerg] no "ssl_certificate" is defined for the "listen ... ssl" directive
nginx: configuration file /etc/nginx/nginx.conf test failed
```

## Nguyên Nhân

Nginx không thể start HTTPS server block (port 443) mà không có SSL certificate được định nghĩa.

## Giải Pháp

### Cách 1: Xóa HTTPS Block, Chỉ Giữ HTTP Block (Khuyến nghị)

**Bước 1:** Tạo config chỉ có HTTP block:

```bash
cd /home/danghongnguyen/Downloads/ai-agent-doc-manage
./api/create-nginx-http-only.sh
```

**Bước 2:** Backup và copy config mới:

```bash
# Backup
sudo cp /etc/nginx/sites-available/n8n /etc/nginx/sites-available/n8n.backup.$(date +%Y%m%d_%H%M%S)

# Copy config mới
sudo cp /tmp/n8n-nginx-http-only.conf /etc/nginx/sites-available/n8n
```

**Bước 3:** Test và reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

**Bước 4:** Chạy certbot để tự động thêm HTTPS:

```bash
sudo certbot --nginx -d n8n.aidocmanageagent.io.vn
```

Certbot sẽ tự động:
- ✅ Tạo SSL certificate
- ✅ Thêm HTTPS server block với location `/api/` route đến backend
- ✅ Reload nginx

### Cách 2: Sửa Thủ Công

**Bước 1:** Mở file config:

```bash
sudo nano /etc/nginx/sites-available/n8n
```

**Bước 2:** Xóa hoặc comment HTTPS server block (từ `server {` với `listen 443` đến `}` tương ứng)

**Bước 3:** Chỉ giữ lại HTTP server block (port 80) với location `/api/`:

```nginx
server {
    listen 80;
    server_name n8n.aidocmanageagent.io.vn;

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
        proxy_pass http://127.0.0.1:5678;
        ...
    }
}
```

**Bước 4:** Test và reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

**Bước 5:** Chạy certbot:

```bash
sudo certbot --nginx -d n8n.aidocmanageagent.io.vn
```

## Kiểm Tra

Sau khi hoàn thành:

```bash
# Test nginx config
sudo nginx -t

# Test nginx status
sudo systemctl status nginx

# Test API qua HTTP (tạm thời)
curl http://n8n.aidocmanageagent.io.vn/api/document/get-from-postgres/doc_1766741636080_ubk9wvp5u

# Sau khi certbot setup SSL, test HTTPS
curl https://n8n.aidocmanageagent.io.vn/api/document/get-from-postgres/doc_1766741636080_ubk9wvp5u
```

## Lưu Ý

1. **Certbot tự động thêm HTTPS**: Khi chạy `certbot --nginx`, nó sẽ tự động:
   - Tạo SSL certificate
   - Thêm HTTPS server block
   - Giữ nguyên location `/api/` route đến backend
   - Reload nginx

2. **Thứ tự location blocks**: Certbot sẽ tự động đảm bảo location `/api/` đứng trước location `/`

3. **HTTP redirect**: Certbot có thể thêm redirect từ HTTP sang HTTPS, điều này là tốt cho production

## Troubleshooting

### Lỗi: "Job for nginx.service failed"

**Nguyên nhân**: Config có lỗi syntax hoặc HTTPS block chưa có SSL

**Giải pháp**: 
1. Xóa HTTPS block chưa có SSL
2. Test: `sudo nginx -t`
3. Reload: `sudo systemctl reload nginx`

### Lỗi: "certbot: nginx plugin is not working"

**Nguyên nhân**: Nginx config có lỗi, certbot không thể test

**Giải pháp**:
1. Sửa nginx config để không có lỗi
2. Test: `sudo nginx -t` (phải pass)
3. Chạy lại certbot

### Lỗi: "SSL certificate already exists"

**Nguyên nhân**: Đã có SSL certificate cho domain này

**Giải pháp**: Certbot sẽ tự động sử dụng certificate hiện có và cập nhật config

