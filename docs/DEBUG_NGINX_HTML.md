# Debug: Domain Vẫn Trả Về HTML

## Vấn đề

Sau khi cập nhật Nginx config, domain vẫn trả về HTML thay vì PDF.

## Nguyên nhân có thể

1. **Location blocks chưa được thêm vào config**
2. **Location blocks đặt sai thứ tự** (sau `location /`)
3. **Nginx chưa reload/restart**
4. **Syntax error trong config**

## Các bước Debug

### Bước 1: Kiểm tra location blocks đã có chưa

```bash
sudo grep -n "location /uploads/" /etc/nginx/sites-available/n8n
sudo grep -n "location /api/" /etc/nginx/sites-available/n8n
```

**Nếu không có output** → Location blocks chưa được thêm!

### Bước 2: Kiểm tra thứ tự location blocks

```bash
# Tìm dòng của location /uploads/
UPLOADS_LINE=$(sudo grep -n "location /uploads/" /etc/nginx/sites-available/n8n | cut -d: -f1)

# Tìm dòng của location /
ROOT_LINE=$(sudo grep -n "^[[:space:]]*location /[^/]" /etc/nginx/sites-available/n8n | head -1 | cut -d: -f1)

# So sánh
if [ "$UPLOADS_LINE" -lt "$ROOT_LINE" ]; then
    echo "✅ Đúng: /uploads/ đứng trước /"
else
    echo "❌ Sai: /uploads/ đứng sau /"
fi
```

**Nếu sai** → Cần di chuyển location blocks lên trước `location /`!

### Bước 3: Xem toàn bộ config

```bash
sudo cat /etc/nginx/sites-available/n8n
```

Kiểm tra:
- Có `location /uploads/` không?
- Có `location /api/` không?
- Chúng có đứng TRƯỚC `location /` không?

### Bước 4: Test config syntax

```bash
sudo nginx -t
```

**Nếu có lỗi** → Sửa lỗi syntax trước!

### Bước 5: Restart Nginx

```bash
# Thử restart thay vì reload
sudo systemctl restart nginx

# Hoặc
sudo systemctl stop nginx
sudo systemctl start nginx
```

### Bước 6: Test lại

```bash
curl -I https://n8n.aidocmanageagent.io.vn/uploads/test.pdf
# Should return: Content-Type: application/pdf
```

## Giải pháp: Thêm Location Blocks Đúng Cách

### Cách 1: Dùng Script Tự động

```bash
cd /home/danghongnguyen/Downloads/ai-agent-doc-manage
./api/add-nginx-locations.sh
```

### Cách 2: Sửa Thủ công

1. **Mở file:**
```bash
sudo nano /etc/nginx/sites-available/n8n
```

2. **Tìm dòng `location /`** (thường có dạng):
```nginx
    location / {
        proxy_pass http://localhost:5678;
        ...
    }
```

3. **Thêm TRƯỚC dòng đó:**
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

4. **Lưu:** `Ctrl+O`, `Enter`, `Ctrl+X`

5. **Test và restart:**
```bash
sudo nginx -t
sudo systemctl restart nginx
```

## Ví dụ File Config Đúng

```nginx
server {
    listen 80;
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
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Checklist

- [ ] Location `/uploads/` đã được thêm
- [ ] Location `/api/` đã được thêm
- [ ] Cả 2 location đứng TRƯỚC `location /`
- [ ] Config syntax OK (`sudo nginx -t`)
- [ ] Nginx đã restart (`sudo systemctl restart nginx`)
- [ ] Test domain trả về PDF (`curl -I https://n8n.aidocmanageagent.io.vn/uploads/test.pdf`)

## Sau khi fix

1. Test lại workflow trong N8N
2. Upload file mới từ frontend
3. Kiểm tra N8N execution logs

