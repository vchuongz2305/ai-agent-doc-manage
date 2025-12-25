# 🔄 Hướng dẫn Reload Nginx để áp dụng config mới

## Vấn đề hiện tại

Backend trả về PDF thành công (Status 200) khi test trực tiếp, nhưng qua Nginx vẫn bị lỗi 404.

**Nguyên nhân**: Nginx chưa reload config mới sau khi cập nhật.

## Các bước reload Nginx

### Bước 1: Kiểm tra Nginx config syntax

```bash
sudo nginx -t
```

Kết quả mong đợi:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Bước 2: Reload Nginx

Có 2 cách:

**Cách 1: Reload (khuyến nghị - không làm gián đoạn service)**
```bash
sudo systemctl reload nginx
```

**Cách 2: Restart (nếu reload không hoạt động)**
```bash
sudo systemctl restart nginx
```

### Bước 3: Kiểm tra Nginx status

```bash
sudo systemctl status nginx
```

Kết quả mong đợi:
```
● nginx.service - A high performance web server and a reverse proxy
   Active: active (running)
```

### Bước 4: Test lại URL

```bash
cd api
node test-url-encoding.js
```

Hoặc test trực tiếp:

```bash
# Test HTTP
curl -I "http://n8n.aidocmanageagent.io.vn/uploads/1764665251723-Th%C3%B4ng_tin_Tr%E1%BA%A7n_h%C3%A0_Duy.pdf"

# Test HTTPS (nếu có cấu hình SSL)
curl -I "https://n8n.aidocmanageagent.io.vn/uploads/1764665251723-Th%C3%B4ng_tin_Tr%E1%BA%A7n_h%C3%A0_Duy.pdf"
```

## Kết quả mong đợi sau khi reload

✅ **HTTP**: Status 200, Content-Type: application/pdf
✅ **HTTPS**: Status 200, Content-Type: application/pdf (nếu có SSL config)

## Troubleshooting

### Nếu reload thất bại:

1. **Kiểm tra logs:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

2. **Kiểm tra config có lỗi:**
   ```bash
   sudo nginx -T | grep -A 10 "location /uploads/"
   ```

3. **Kiểm tra backend có đang chạy:**
   ```bash
   curl http://localhost:5000/api/health
   ```

### Nếu vẫn lỗi 404 sau khi reload:

1. **Kiểm tra backend route:**
   - Route: `/uploads/:fileName(*)`
   - File: `api/unified-document-agent.js` (dòng 894)

2. **Kiểm tra file có tồn tại:**
   ```bash
   ls -la uploads/ | grep 1764665251723
   ```

3. **Kiểm tra backend logs:**
   Xem console của backend server để thấy request đến

## Script tự động

Đã tạo script `api/fix-nginx-url-encoding.sh`:

```bash
chmod +x api/fix-nginx-url-encoding.sh
sudo ./api/fix-nginx-url-encoding.sh
```

Script này sẽ:
1. Kiểm tra Nginx config syntax
2. Reload Nginx
3. Test URL encoding

## Lưu ý

- ⚠️ Reload Nginx sẽ không làm gián đoạn service hiện có
- ⚠️ Restart Nginx sẽ làm gián đoạn service trong vài giây
- ⚠️ Đảm bảo backend đang chạy trước khi test

