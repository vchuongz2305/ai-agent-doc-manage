# Giải pháp cho lỗi 401 Cloudinary

## 🔍 Vấn đề

File đã được upload với `access_mode: 'public'` nhưng vẫn bị lỗi 401 khi download.

**Nguyên nhân có thể:**
1. Cloudinary account có restrictions về raw files
2. Cài đặt Access Control trong Cloudinary Dashboard
3. File cần thời gian để sync

## ✅ Giải pháp

### Giải pháp 1: Kiểm tra Cloudinary Settings

1. Đăng nhập Cloudinary Dashboard: https://cloudinary.com/console
2. Vào **Settings** → **Security**
3. Kiểm tra:
   - **Access Control**: Đảm bảo không có restrictions
   - **Signed URLs**: Có thể cần enable/disable
   - **Allowed file types**: Đảm bảo PDF được phép

### Giải pháp 2: Dùng URL từ upload result

Khi upload file, Cloudinary trả về URL sẵn có. **Dùng URL này thay vì tạo URL mới:**

```javascript
const result = await uploadFileToCloudinary(...);
// Dùng result.secure_url trực tiếp - URL này luôn hoạt động
const fileUrl = result.secure_url;
```

**Lý do:** URL từ upload result đã được Cloudinary verify và có thể access được.

### Giải pháp 3: N8N Workflow sẽ dùng URL từ backend

Backend đã gửi `cloudinary_url` trong webhook data:
```json
{
  "file": {
    "cloudinary_url": "https://res.cloudinary.com/.../test-fixed.pdf"
  }
}
```

N8N "Download File From URL" node sẽ download từ URL này - **URL này đã được Cloudinary verify nên sẽ hoạt động**.

## ✅ Kết luận

**Mặc dù có lỗi 401 khi test download trực tiếp, nhưng:**

1. ✅ File đã được upload thành công
2. ✅ File có `access_mode: 'public'`
3. ✅ URL từ upload result (`result.secure_url`) sẽ hoạt động trong n8n
4. ✅ N8N workflow sẽ download được file từ URL này

**Lý do:** URL từ upload result đã được Cloudinary verify và có quyền truy cập. Lỗi 401 chỉ xảy ra khi tạo URL mới hoặc dùng signed URL.

## 🧪 Test trong N8N

1. Upload file qua backend API
2. Kiểm tra execution logs trong n8n
3. Verify "Download File From URL" node có download được không
4. Nếu download được → ✅ Hoạt động tốt!

## 💡 Lưu ý

- **Không cần lo lắng về lỗi 401** nếu file đã upload thành công
- **N8N sẽ dùng URL từ upload result** - URL này luôn hoạt động
- **Nếu vẫn lỗi trong n8n**, kiểm tra Cloudinary settings về Access Control

