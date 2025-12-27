# Sửa Lỗi Certbot Verification

## Vấn Đề

Certbot không thể verify domain vì:
1. `/.well-known/acme-challenge/` đang bị route đến n8n thay vì để certbot xử lý
2. Domain có thể đang được proxy qua Cloudflare (IP `2606:4700:3035::ac43:bdd1`)

## Giải Pháp

### Bước 1: Cập Nhật Nginx Config

Config đã được cập nhật với location block cho `/.well-known/acme-challenge/`. Copy lại:

```bash
# Backup
sudo cp /etc/nginx/sites-available/n8n /etc/nginx/sites-available/n8n.backup.$(date +%Y%m%d_%H%M%S)

# Copy config mới (đã có location /.well-known/acme-challenge/)
sudo cp /tmp/n8n-nginx-http-only.conf /etc/nginx/sites-available/n8n

# Test
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

### Bước 2: Tạo Thư Mục cho Certbot

```bash
sudo mkdir -p /var/www/html/.well-known/acme-challenge
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
```

### Bước 3: Kiểm Tra Cloudflare Proxy

Nếu domain đang được proxy qua Cloudflare (orange cloud ON), bạn có 2 lựa chọn:

#### Option A: Tắt Cloudflare Proxy (Khuyến nghị cho certbot)

1. Vào Cloudflare Dashboard
2. DNS → Tìm record `n8n.aidocmanageagent.io.vn`
3. Click vào icon cloud (orange) để tắt proxy (chuyển sang gray/direct)
4. Chờ vài phút để DNS propagate
5. Chạy lại certbot:

```bash
sudo certbot --nginx -d n8n.aidocmanageagent.io.vn
```

6. Sau khi có SSL, có thể bật lại Cloudflare proxy

#### Option B: Dùng DNS Challenge (Nếu muốn giữ Cloudflare proxy)

```bash
sudo certbot certonly --manual --preferred-challenges dns -d n8n.aidocmanageagent.io.vn
```

Certbot sẽ yêu cầu thêm TXT record vào DNS. Sau đó:

```bash
# Certbot sẽ tạo certificate tại /etc/letsencrypt/live/n8n.aidocmanageagent.io.vn/
# Bạn cần thêm HTTPS block vào nginx config thủ công
```

### Bước 4: Chạy Lại Certbot

Sau khi hoàn thành các bước trên:

```bash
sudo certbot --nginx -d n8n.aidocmanageagent.io.vn
```

Certbot sẽ:
- ✅ Verify domain qua `/.well-known/acme-challenge/`
- ✅ Tạo SSL certificate
- ✅ Tự động thêm HTTPS server block với location `/api/` route đến backend
- ✅ Reload nginx

## Kiểm Tra

Sau khi hoàn thành:

```bash
# Test SSL certificate
sudo certbot certificates

# Test HTTPS
curl https://n8n.aidocmanageagent.io.vn/api/document/get-from-postgres/doc_1766741636080_ubk9wvp5u

# Kiểm tra nginx config
sudo nginx -t
```

## Troubleshooting

### Lỗi: "Invalid response from http://n8n.aidocmanageagent.io.vn/.well-known/acme-challenge/..."

**Nguyên nhân**: 
- Location `/.well-known/acme-challenge/` chưa được cấu hình đúng
- Hoặc domain đang được proxy qua Cloudflare

**Giải pháp**:
1. Kiểm tra nginx config có location `/.well-known/acme-challenge/` không
2. Tắt Cloudflare proxy tạm thời
3. Test: `curl http://n8n.aidocmanageagent.io.vn/.well-known/acme-challenge/test` (sẽ trả về 404, nhưng không phải HTML của n8n)

### Lỗi: "Domain points to Cloudflare"

**Giải pháp**: 
- Tắt Cloudflare proxy (gray cloud)
- Hoặc dùng DNS challenge: `sudo certbot certonly --manual --preferred-challenges dns -d n8n.aidocmanageagent.io.vn`

### Lỗi: "Permission denied" khi tạo thư mục

**Giải pháp**: 
```bash
sudo mkdir -p /var/www/html/.well-known/acme-challenge
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
```

## Lưu Ý

1. **Cloudflare Proxy**: Nếu domain đang dùng Cloudflare proxy (orange cloud), certbot HTTP challenge sẽ không hoạt động. Cần tắt proxy hoặc dùng DNS challenge.

2. **Thứ tự location blocks**: Location `/.well-known/acme-challenge/` PHẢI đứng TRƯỚC location `/`

3. **Auto-renewal**: Certbot tự động setup cron job để renew certificate. Kiểm tra:
   ```bash
   sudo systemctl status certbot.timer
   ```

