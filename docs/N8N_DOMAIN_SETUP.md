# Setup Backend với N8N Domain

## Tình huống

- N8N đang chạy trên: `https://n8n.aidocmanageagent.io.vn/`
- Backend đang chạy trên: `http://localhost:5000` (local)
- Đã cấu hình: `API_BASE_URL=https://n8n.aidocmanageagent.io.vn`

## Vấn đề

Backend hiện tại đang chạy trên `localhost:5000`, nhưng N8N cần download file từ `https://n8n.aidocmanageagent.io.vn/uploads/...`. 

Để điều này hoạt động, bạn cần **expose backend qua domain `n8n.aidocmanageagent.io.vn`**.

## Giải pháp: Setup Reverse Proxy (Nginx)

### 1. Cài đặt Nginx (nếu chưa có)

```bash
sudo apt update
sudo apt install nginx
```

### 2. Cấu hình Nginx

Tạo file config: `/etc/nginx/sites-available/n8n-backend`

```nginx
server {
    listen 80;
    server_name n8n.aidocmanageagent.io.vn;

    # Proxy cho N8N (nếu N8N chạy trên port khác, ví dụ 5678)
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

    # Proxy cho Backend API (uploads và API endpoints)
    location /uploads/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Enable site và restart Nginx

```bash
sudo ln -s /etc/nginx/sites-available/n8n-backend /etc/nginx/sites-enabled/
sudo nginx -t  # Test config
sudo systemctl restart nginx
```

### 4. Setup SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d n8n.aidocmanageagent.io.vn
```

### 5. Kiểm tra

Sau khi setup, test:

```bash
# Test từ browser hoặc curl
curl https://n8n.aidocmanageagent.io.vn/uploads/test-file.pdf
curl https://n8n.aidocmanageagent.io.vn/api/document/process
```

## Lưu ý

1. **Backend phải chạy trên localhost:5000** - Nginx sẽ proxy requests đến đây
2. **N8N có thể chạy trên port khác** (ví dụ 5678) - cập nhật trong nginx config
3. **Firewall** - Đảm bảo port 80/443 mở, nhưng không cần mở port 5000 ra ngoài
4. **SSL** - Nên dùng HTTPS để bảo mật

## Alternative: Nếu N8N và Backend cùng server

Nếu cả 2 đều chạy trên cùng server, bạn có thể:
- Dùng cùng domain với paths khác nhau (như config trên)
- Hoặc tạo subdomain riêng: `api.aidocmanageagent.io.vn` cho backend

## Troubleshooting

### Lỗi 502 Bad Gateway
- Kiểm tra backend có đang chạy không: `curl http://localhost:5000/api/document/process`
- Kiểm tra nginx config: `sudo nginx -t`
- Kiểm tra nginx logs: `sudo tail -f /var/log/nginx/error.log`

### Lỗi 404 Not Found
- Kiểm tra path trong nginx config có đúng không
- Kiểm tra backend route có đúng không

### Lỗi SSL
- Kiểm tra certbot đã setup SSL chưa
- Kiểm tra DNS có trỏ đúng IP không

