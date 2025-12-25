# ⚡ QUICK FIX - Reload Nginx để fix URL encoding

## Vấn đề hiện tại

✅ Backend trực tiếp: **200 OK, trả về PDF thành công**
❌ Qua Nginx: **404 "Cannot GET /uploads/..."**

**Nguyên nhân**: Nginx chưa reload config mới!

## Giải pháp nhanh

### Bước 1: Reload Nginx

Chạy lệnh sau để reload Nginx:

```bash
sudo systemctl reload nginx
```

Hoặc nếu cần restart:

```bash
sudo systemctl restart nginx
```

### Bước 2: Test lại

Sau khi reload, test lại:

```bash
cd api
node test-url-encoding.js
```

### Kết quả mong đợi

Sau khi reload, cả HTTP và HTTPS đều phải trả về:
- ✅ Status: **200 OK**
- ✅ Content-Type: **application/pdf**

## Kiểm tra nhanh

```bash
# Test HTTP
curl -I "http://n8n.aidocmanageagent.io.vn/uploads/1764665251723-Th%C3%B4ng_tin_Tr%E1%BA%A7n_h%C3%A0_Duy.pdf"

# Test HTTPS  
curl -I "https://n8n.aidocmanageagent.io.vn/uploads/1764665251723-Th%C3%B4ng_tin_Tr%E1%BA%A7n_h%C3%A0_Duy.pdf"
```

## Nếu vẫn lỗi

1. **Kiểm tra Nginx config syntax:**
   ```bash
   sudo nginx -t
   ```

2. **Kiểm tra backend có đang chạy:**
   ```bash
   curl http://localhost:5000/api/health
   ```

3. **Xem Nginx logs:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

## Chi tiết

Xem thêm:
- `docs/NGINX_RELOAD_INSTRUCTIONS.md` - Hướng dẫn chi tiết
- `docs/FIX_URL_ENCODING.md` - Giải thích vấn đề và giải pháp

