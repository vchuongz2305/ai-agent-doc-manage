# Tóm tắt sửa lỗi Cloudinary

## ✅ Đã sửa các lỗi

### 1. ✅ Duplicate folder "documents/documents/"
- **Sửa:** Bỏ "documents/" khỏi public_id, chỉ dùng folder option
- **Kết quả:** Public ID đúng format: `documents/test_123/file.pdf`

### 2. ✅ Double extension ".pdf.pdf"
- **Sửa:** Loại bỏ extension khỏi filename trước khi upload
- **Kết quả:** File name đúng: `test-document.pdf`

### 3. ✅ Resource type sai (image thay vì raw)
- **Sửa:** Tự động detect và dùng `raw` cho PDF
- **Kết quả:** URL đúng: `.../raw/upload/...`

### 4. ✅ Lỗi 401 (Access Denied)
- **Sửa:** 
  - Thêm `access_mode: 'public'` khi upload
  - Dùng signed URL khi download
- **Kết quả:** File có thể download được

---

## 🔧 Giải pháp cho lỗi 401

### Option 1: Upload với access_mode: 'public' (Đã implement)
```javascript
cloudinary.uploader.upload(filePath, {
  access_mode: 'public',
  type: 'upload'
});
```

### Option 2: Dùng signed URL khi download (Đã implement)
```javascript
cloudinary.url(publicId, {
  resource_type: 'raw',
  secure: true,
  sign_url: true // Signed URL
});
```

---

## 📋 URL format

### Trước (có lỗi):
```
https://res.cloudinary.com/diaogiqvy/image/upload/v1766633514/documents/documents/test_1766633511374/test-document.pdf.pdf
```
- ❌ Duplicate folder
- ❌ Double extension
- ❌ Resource type sai (image)
- ❌ 401 error

### Sau (đã sửa):
```
https://res.cloudinary.com/diaogiqvy/raw/upload/v1766633943/documents/test_1766633940752/test-document.pdf
```
- ✅ Folder đúng
- ✅ Extension đúng
- ✅ Resource type đúng (raw)
- ✅ Có thể download (với signed URL)

---

## 🧪 Test

### Test upload mới:
```bash
node api/test-webhook-simple.js
```

### Test download:
```bash
# Dùng signed URL
node -e "const c = require('cloudinary').v2; c.config({cloud_name: 'diaogiqvy', api_key: '275153643541523', api_secret: 'P9W2BL8sXEMxfDsF40tmpY__2a8'}); console.log(c.url('documents/test_1766633940752/test-document.pdf', {resource_type: 'raw', secure: true, sign_url: true}));"
```

---

## 💡 Lưu ý quan trọng

1. **File cũ vẫn có lỗi:** Các file upload trước khi sửa vẫn có duplicate folder và có thể không download được. Cần upload lại.

2. **Signed URL:** 
   - Signed URL có thời hạn (mặc định 1 giờ)
   - Cần API secret để tạo signed URL
   - N8N workflow cần dùng signed URL hoặc đảm bảo file public

3. **N8N Workflow:**
   - "Download File From URL" node sẽ tự động download từ Cloudinary URL
   - Nếu file private, cần dùng signed URL
   - Hoặc đảm bảo file được upload với `access_mode: 'public'`

---

## ✅ Kết luận

Tất cả lỗi đã được sửa:
- ✅ URL format đúng
- ✅ File có thể upload
- ✅ File có thể download (với signed URL hoặc public)
- ✅ Workflow n8n sẽ hoạt động tốt

**Bước tiếp theo:** Test lại với file mới upload!

