# Hướng Dẫn Setup SSL Certificate

## Tình Huống

Domain `n8n.aidocmanageagent.io.vn` đang được proxy qua Cloudflare, khiến certbot HTTP challenge không hoạt động.

## Giải Pháp: Có 2 Cách

### Cách 1: Tắt Cloudflare Proxy và Dùng HTTP Challenge (Khuyến nghị - Đơn giản nhất)

**Bước 1:** Tắt Cloudflare Proxy

1. Đăng nhập vào Cloudflare Dashboard: https://dash.cloudflare.com
2. Chọn domain `aidocmanageagent.io.vn`
3. Vào **DNS** → Tìm record `n8n` (type A hoặc CNAME)
4. Click vào icon **cloud màu cam** để tắt proxy (chuyển sang **gray/direct**)
5. Chờ 2-5 phút để DNS propagate

**Bước 2:** Verify DNS đã trỏ trực tiếp

```bash
# Kiểm tra IP của domain (không phải Cloudflare IP)
dig +short n8n.aidocmanageagent.io.vn

# Nếu thấy IP của server bạn (không phải Cloudflare IP), thì OK
```

**Bước 3:** Apply nginx config (nếu chưa làm)

```bash
cd /home/danghongnguyen/Downloads/ai-agent-doc-manage
./api/apply-nginx-config.sh
```

**Bước 4:** Chạy certbot với HTTP challenge

```bash
sudo certbot --nginx -d n8n.aidocmanageagent.io.vn
```

Certbot sẽ tự động:
- ✅ Verify domain qua `/.well-known/acme-challenge/`
- ✅ Tạo SSL certificate
- ✅ Thêm HTTPS server block với location `/api/` route đến backend
- ✅ Reload nginx

**Bước 5:** Bật lại Cloudflare Proxy (tùy chọn)

Sau khi có SSL, có thể bật lại Cloudflare proxy nếu muốn (nhưng cần cấu hình SSL mode là "Full" hoặc "Full (strict)").

---

### Cách 2: Dùng DNS Challenge (Nếu không thể tắt Cloudflare proxy)

**Bước 1:** Chạy certbot với DNS challenge

```bash
sudo certbot certonly --manual --preferred-challenges dns -d n8n.aidocmanageagent.io.vn
```

Certbot sẽ hiển thị:
```
Please deploy a DNS TXT record under the name:
_acme-challenge.n8n.aidocmanageagent.io.vn.

with the following value:
ENraG8H4OOJUdcDVFNHvXMIJyxcFn5XadSFacnE0_H0
```

**Bước 2:** Thêm TXT Record vào Cloudflare DNS

1. Đăng nhập vào Cloudflare Dashboard: https://dash.cloudflare.com
2. Chọn domain `aidocmanageagent.io.vn`
3. Vào **DNS** → Click **Add record**
4. Điền thông tin:
   - **Type**: `TXT`
   - **Name**: `_acme-challenge.n8n` (hoặc `_acme-challenge.n8n.aidocmanageagent.io.vn`)
   - **Content**: `ENraG8H4OOJUdcDVFNHvXMIJyxcFn5XadSFacnE0_H0` (value từ certbot)
   - **TTL**: `Auto` hoặc `3600`
5. Click **Save**

**Bước 3:** Verify TXT Record

Chờ 1-2 phút, sau đó verify:

```bash
# Kiểm tra TXT record
dig TXT _acme-challenge.n8n.aidocmanageagent.io.vn

# Hoặc dùng online tool
# https://toolbox.googleapps.com/apps/dig/#TXT/_acme-challenge.n8n.aidocmanageagent.io.vn
```

Bạn sẽ thấy value `ENraG8H4OOJUdcDVFNHvXMIJyxcFn5XadSFacnE0_H0` trong kết quả.

**Bước 4:** Quay lại terminal và nhấn Enter

Sau khi verify TXT record đã có, quay lại terminal và nhấn **Enter** để certbot tiếp tục.

**Bước 5:** Thêm HTTPS Block vào Nginx Config

Sau khi certbot tạo certificate, bạn cần thêm HTTPS server block vào nginx config thủ công:

```bash
# Certificate sẽ được tạo tại:
# /etc/letsencrypt/live/n8n.aidocmanageagent.io.vn/fullchain.pem
# /etc/letsencrypt/live/n8n.aidocmanageagent.io.vn/privkey.pem

# Thêm HTTPS block vào nginx config
sudo nano /etc/nginx/sites-available/n8n
```

Thêm sau HTTP block:

```nginx
# HTTPS Server Block
server {
    listen 443 ssl http2;
    server_name n8n.aidocmanageagent.io.vn;

    ssl_certificate /etc/letsencrypt/live/n8n.aidocmanageagent.io.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/n8n.aidocmanageagent.io.vn/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Allow Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files $uri =404;
    }

    # Proxy /uploads/ đến Backend
    location /uploads/ {
        proxy_pass http://localhost:5000/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

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

**Bước 6:** Test và Reload

```bash
sudo nginx -t
sudo systemctl reload nginx
```

**Bước 7:** Xóa TXT Record (sau khi có SSL)

Sau khi có SSL, có thể xóa TXT record `_acme-challenge.n8n.aidocmanageagent.io.vn` trong Cloudflare DNS.

---

## So Sánh 2 Cách

| Tiêu chí | Cách 1: HTTP Challenge | Cách 2: DNS Challenge |
|----------|----------------------|----------------------|
| Độ khó | ⭐ Dễ | ⭐⭐ Trung bình |
| Thời gian | 5-10 phút | 10-15 phút |
| Yêu cầu | Tắt Cloudflare proxy | Thêm TXT record |
| Tự động hóa | Certbot tự động setup | Cần thêm HTTPS block thủ công |
| Khuyến nghị | ✅ Cho lần đầu | Khi không thể tắt proxy |

## Kiểm Tra Sau Khi Setup

```bash
# Test SSL certificate
sudo certbot certificates

# Test HTTPS API
curl https://n8n.aidocmanageagent.io.vn/api/document/get-from-postgres/doc_1766741636080_ubk9wvp5u

# Kiểm tra SSL từ browser
# https://n8n.aidocmanageagent.io.vn
```

## Troubleshooting

### Lỗi: "DNS problem: NXDOMAIN"

**Nguyên nhân**: TXT record chưa được thêm hoặc chưa propagate

**Giải pháp**:
1. Kiểm tra TXT record đã được thêm vào Cloudflare DNS chưa
2. Chờ thêm 2-3 phút để DNS propagate
3. Verify: `dig TXT _acme-challenge.n8n.aidocmanageagent.io.vn`

### Lỗi: "Invalid response from http://..."

**Nguyên nhân**: Domain vẫn đang được proxy qua Cloudflare

**Giải pháp**: Tắt Cloudflare proxy (gray cloud) và chờ DNS propagate

### Lỗi: "Certificate already exists"

**Giải pháp**: 
```bash
# Xem certificate hiện có
sudo certbot certificates

# Nếu muốn renew
sudo certbot renew
```

## Auto-Renewal

Certbot tự động setup cron job để renew certificate. Kiểm tra:

```bash
# Kiểm tra certbot timer
sudo systemctl status certbot.timer

# Test renewal (dry-run)
sudo certbot renew --dry-run
```

