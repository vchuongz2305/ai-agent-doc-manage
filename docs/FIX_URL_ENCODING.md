# 🔧 Fix URL Encoding với ký tự tiếng Việt

## Vấn đề

File path trên server:
```
/home/danghongnguyen/Downloads/ai-agent-doc-manage/uploads/1764665251723-Thông_tin_Trần_hà_Duy.pdf
```

URL được tạo:
```
https://n8n.aidocmanageagent.io.vn/uploads/1764665251723-Th%C3%B4ng_tin_Tr%E1%BA%A7n_h%C3%A0_Duy.pdf
```

URL đã được encode đúng, nhưng khi truy cập qua Nginx bị lỗi 404.

## Nguyên nhân

1. Nginx proxy không giữ nguyên URI encoding khi proxy đến backend
2. Backend route không nhận được URL encoding đúng

## Giải pháp đã thực hiện

### 1. Cập nhật Nginx Config

Đã cập nhật `/etc/nginx/sites-available/n8n`:

```nginx
location /uploads/ {
    proxy_pass http://localhost:5000/uploads/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
    
    # Giữ nguyên URI encoding để backend có thể decode đúng
    proxy_set_header X-Original-URI $request_uri;
}
```

### 2. Backend đã có sẵn code xử lý

Backend route `/uploads/:fileName(*)` đã có code decode URL encoding (dòng 896 trong `unified-document-agent.js`).

## Các bước để áp dụng fix

### Bước 1: Kiểm tra Nginx config syntax

```bash
sudo nginx -t
```

### Bước 2: Reload Nginx

```bash
sudo systemctl reload nginx
```

Hoặc restart Nginx:

```bash
sudo systemctl restart nginx
```

### Bước 3: Test URL encoding

```bash
cd api
node test-url-encoding.js
```

Hoặc test trực tiếp:

```bash
# Test với backend trực tiếp
curl -I "http://localhost:5000/uploads/1764665251723-Th%C3%B4ng_tin_Tr%E1%BA%A7n_h%C3%A0_Duy.pdf"

# Test qua Nginx HTTP
curl -I "http://n8n.aidocmanageagent.io.vn/uploads/1764665251723-Th%C3%B4ng_tin_Tr%E1%BA%A7n_h%C3%A0_Duy.pdf"

# Test qua Nginx HTTPS
curl -I "https://n8n.aidocmanageagent.io.vn/uploads/1764665251723-Th%C3%B4ng_tin_Tr%E1%BA%A7n_h%C3%A0_Duy.pdf"
```

## Kết quả mong đợi

✅ **Backend trực tiếp**: Status 200, Content-Type: application/pdf
✅ **Qua Nginx HTTP**: Status 200, Content-Type: application/pdf  
✅ **Qua Nginx HTTPS**: Status 200, Content-Type: application/pdf

## Debugging

Nếu vẫn gặp lỗi 404:

1. **Kiểm tra backend có đang chạy không:**
   ```bash
   curl http://localhost:5000/api/health
   ```

2. **Kiểm tra file có tồn tại không:**
   ```bash
   ls -la uploads/ | grep 1764665251723
   ```

3. **Kiểm tra Nginx error logs:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

4. **Kiểm tra backend logs:**
   Xem console của backend server để thấy request đến

5. **Kiểm tra route matching:**
   - Backend route: `/uploads/:fileName(*)`
   - Nginx proxy: `http://localhost:5000/uploads/`

## Script tự động

Đã tạo script `api/fix-nginx-url-encoding.sh` để tự động reload Nginx:

```bash
chmod +x api/fix-nginx-url-encoding.sh
sudo ./api/fix-nginx-url-encoding.sh
```

## Lưu ý

- ⚠️ Đảm bảo backend đang chạy trước khi test
- ⚠️ Nginx cần được reload sau khi thay đổi config
- ⚠️ File phải tồn tại trong thư mục `uploads/`

