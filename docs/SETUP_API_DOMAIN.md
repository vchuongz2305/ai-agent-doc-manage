# Setup API Domain cho N8N

## Tình huống hiện tại

- N8N đang chạy trên: `https://n8n.aidocmanageagent.io.vn/`
- Backend đang chạy trên: `http://192.168.1.6:5000` (local)
- N8N cần download file từ backend nhưng không thể truy cập `localhost:5000`

## Giải pháp đã áp dụng

Đã cấu hình `API_BASE_URL=http://192.168.1.6:5000` trong file `.env`.

**Lưu ý:** Giải pháp này chỉ hoạt động nếu:
- N8N và backend cùng network (cùng LAN)
- Firewall cho phép truy cập port 5000 từ N8N server

## Option 2: Setup subdomain api.aidocmanageagent.io.vn (Khuyến nghị cho production)

Nếu muốn dùng domain như N8N, bạn cần:

### 1. Tạo subdomain trong DNS

Thêm A record:
```
api.aidocmanageagent.io.vn → IP của backend server
```

### 2. Setup reverse proxy (nginx)

Cài đặt nginx và cấu hình:

```nginx
server {
    listen 80;
    server_name api.aidocmanageagent.io.vn;

    location / {
        proxy_pass http://localhost:5000;
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

### 3. Setup SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d api.aidocmanageagent.io.vn
```

### 4. Update .env

```bash
API_BASE_URL=https://api.aidocmanageagent.io.vn
```

## Option 3: Nếu N8N và backend cùng server

Nếu cả 2 đều chạy trên cùng server với N8N:

```bash
API_BASE_URL=http://localhost:5000
```

Hoặc nếu có reverse proxy:

```bash
API_BASE_URL=https://api.aidocmanageagent.io.vn
```

## Kiểm tra cấu hình

Sau khi cấu hình, test:

```bash
# Test từ N8N server
curl http://192.168.1.6:5000/uploads/test-file.pdf

# Hoặc nếu dùng domain
curl https://api.aidocmanageagent.io.vn/uploads/test-file.pdf
```

## Troubleshooting

### Lỗi: ENOTFOUND
- Kiểm tra DNS có đúng không
- Kiểm tra domain có trỏ đúng IP không

### Lỗi: ECONNREFUSED
- Kiểm tra backend có đang chạy không
- Kiểm tra firewall có chặn port 5000 không
- Kiểm tra nginx có chạy không (nếu dùng reverse proxy)

### Lỗi: Timeout
- Kiểm tra network connectivity
- Kiểm tra firewall rules
- Kiểm tra nginx config

