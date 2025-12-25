# Quick Fix: Lỗi "Invalid PDF structure"

## Vấn đề

N8N vẫn báo lỗi "Invalid PDF structure" vì domain trả về HTML thay vì PDF.

## Nguyên nhân

Nginx chưa được cấu hình để proxy `/uploads/` đến backend.

## Giải pháp nhanh

### Bước 1: Kiểm tra config

```bash
cd /home/danghongnguyen/Downloads/ai-agent-doc-manage
./api/quick-fix-nginx.sh
```

### Bước 2: Sửa Nginx config

Mở file:
```bash
sudo nano /etc/nginx/sites-available/n8n
```

Tìm dòng `location /` và thêm **TRƯỚC** nó:

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

## Hoặc dùng script tự động

```bash
./api/update-nginx-config.sh
```

Script sẽ tự động:
- ✅ Backup file
- ✅ Thêm location blocks
- ✅ Test config
- ✅ Reload Nginx

## Sau khi fix

1. Test lại workflow trong N8N
2. Upload file mới từ frontend
3. Kiểm tra N8N execution logs

## Troubleshooting

### Vẫn trả về HTML
- Kiểm tra thứ tự location blocks (uploads phải trước /)
- Kiểm tra Nginx error log: `sudo tail -f /var/log/nginx/error.log`
- Restart Nginx: `sudo systemctl restart nginx`

### Lỗi 502 Bad Gateway
- Kiểm tra backend có đang chạy: `curl http://localhost:5000/api/document/process`
- Kiểm tra port backend có đúng không

