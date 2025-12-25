# Sửa Lỗi 401 khi N8N Download File từ Cloudinary

## 🔍 Vấn đề

- File được upload lên Cloudinary thành công với `access_mode: 'public'`
- Nhưng khi n8n workflow download file từ URL thì bị lỗi **401 "Authorization failed"**
- Lỗi: "Customer is marked as untrusted"

## ✅ Giải pháp

### Tạo Signed URL cho N8N

Backend sẽ tạo **signed URL** trước khi gửi cho n8n workflow. Signed URL có signature để bypass access control của Cloudinary.

### Code Changes

**File: `api/unified-document-agent.js`**

1. **Import Cloudinary SDK**:
```javascript
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
```

2. **Tạo Signed URL trước khi gửi cho n8n**:
```javascript
// Tạo signed URL cho n8n để download (tránh lỗi 401)
let downloadUrl = cloudinaryUrl; // Default dùng unsigned URL
try {
  const signedUrl = cloudinary.url(cloudinaryPublicId, {
    resource_type: 'raw',
    secure: true,
    sign_url: true // Signed URL để bypass access control
  });
  downloadUrl = signedUrl;
  console.log(`✅ Created signed URL for n8n download`);
} catch (signError) {
  console.warn(`⚠️  Could not create signed URL, using unsigned URL`);
  // Fallback to unsigned URL
}
```

3. **Gửi signed URL trong webhook data**:
```javascript
const analysisData = {
  file: {
    url: downloadUrl,  // Signed URL
    cloudinary_url: downloadUrl,  // Signed URL (tránh 401)
    cloudinary_public_id: cloudinaryPublicId,
    cloudinary_unsigned_url: cloudinaryUrl  // Giữ unsigned URL để reference
  },
  // ...
};
```

## 📋 Signed URL Format

**Unsigned URL:**
```
https://res.cloudinary.com/diaogiqvy/raw/upload/v1766637889/documents/doc_xxx/file.pdf
```

**Signed URL:**
```
https://res.cloudinary.com/diaogiqvy/raw/upload/s--o36HlPwo--/v1/documents/doc_xxx/file.pdf
```

Signed URL có signature `s--o36HlPwo--` trong path để verify authentication.

## 🔍 Verify

Sau khi restart backend và upload file mới, kiểm tra logs:

```
✅ Created signed URL for n8n download
   Signed URL: https://res.cloudinary.com/diaogiqvy/raw/upload/s--...
```

N8N workflow sẽ nhận signed URL và có thể download file thành công.

## 🚨 Troubleshooting

### Nếu vẫn bị lỗi 401:

1. **Kiểm tra Cloudinary credentials**:
   ```bash
   # Đảm bảo .env có đầy đủ:
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   ```

2. **Kiểm tra signed URL được tạo**:
   - Xem backend logs khi upload file
   - Phải thấy "✅ Created signed URL for n8n download"

3. **Kiểm tra n8n workflow nhận đúng URL**:
   - Xem input của "Download File From URL" node
   - URL phải có signature (`s--...--`)

## 💡 Lưu Ý

1. **Signed URL có thời hạn**: Signed URL của Cloudinary có thể expire sau một thời gian (thường là 1 giờ)
2. **Fallback**: Nếu không tạo được signed URL, sẽ fallback về unsigned URL
3. **N8N workflow**: Sử dụng signed URL từ `cloudinary_url` field

## ✅ Kết luận

Code đã được cập nhật để:
- ✅ Tạo signed URL trước khi gửi cho n8n
- ✅ Gửi signed URL trong `cloudinary_url` field
- ✅ Fallback về unsigned URL nếu tạo signed URL fail
- ✅ Giữ unsigned URL để reference

**N8N workflow giờ sẽ có thể download file từ Cloudinary thành công!**

