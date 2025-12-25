# Hướng dẫn Sửa Nginx Config Thủ công

## Vấn đề

Lỗi: `location "/api/" is outside location "/uploads/"`

Điều này có nghĩa là location `/api/` bị đặt bên trong location `/uploads/`, gây lỗi syntax.

## Giải pháp

### Cách 1: Dùng Script Tự động (Khuyến nghị)

```bash
cd /home/danghongnguyen/Downloads/ai-agent-doc-manage
./api/fix-nginx-complete.sh
```

Script sẽ:
- Backup file
- Xóa tất cả location blocks cũ
- Thêm location blocks mới vào đúng vị trí
- Test và restart Nginx

### Cách 2: Sửa Thủ công

1. **Mở file:**
```bash
sudo nano /etc/nginx/sites-available/n8n
```

2. **Xóa tất cả location blocks cũ** (nếu có):
   - Tìm và xóa tất cả `location /uploads/ { ... }`
   - Tìm và xóa tất cả `location /api/ { ... }`
   - Xóa các dòng comment liên quan

3. **Tìm dòng `location /`** (thường ở dòng 5 hoặc gần đó)

4. **Thêm TRƯỚC dòng `location /`** (quan trọng!):
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

5. **Lưu:** `Ctrl+O`, `Enter`, `Ctrl+X`

6. **Test:**
```bash
sudo nginx -t
```

7. **Nếu OK, restart:**
```bash
sudo systemctl restart nginx
```

## Ví dụ File Config Đúng

```nginx
server {
    listen 80;
    server_name n8n.aidocmanageagent.io.vn;

    # ⚠️ QUAN TRỌNG: Các location này PHẢI đứng TRƯỚC location /
    # Và PHẢI là 2 block riêng biệt, không lồng nhau
    
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
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Lưu ý Quan Trọng

1. **Thứ tự location blocks**: `/uploads/` và `/api/` **PHẢI** đứng **TRƯỚC** `location /`
2. **Không lồng nhau**: Location `/api/` **KHÔNG** được đặt bên trong location `/uploads/`
3. **Mỗi location là block riêng**: Mỗi location phải có `{` và `}` riêng

## Kiểm tra Sau Khi Sửa

```bash
# Test config
sudo nginx -t

# Nếu OK, restart
sudo systemctl restart nginx

# Test domain
curl -I https://n8n.aidocmanageagent.io.vn/uploads/test.pdf
# Should return: Content-Type: application/pdf
```

