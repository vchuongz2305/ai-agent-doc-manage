# Sửa Lỗi Upload File từ Frontend lên Cloudinary

## 🔍 Vấn đề

- ✅ Test file upload lên Cloudinary hoạt động bình thường
- ❌ Upload từ frontend bị lỗi "Customer is marked as untrusted" hoặc các lỗi khác

## ✅ Đã sửa

### 1. Cải thiện Upload Options

Đã thêm các options đầy đủ khi upload để tránh lỗi:

```javascript
const uploadOptions = {
  public_id: publicId,
  resource_type: resourceType, // raw cho PDF
  folder: 'documents',
  overwrite: true,
  use_filename: false,
  unique_filename: false,
  access_mode: 'public', // Đảm bảo file public
  type: 'upload', // Đảm bảo là upload type
  invalidate: true,
  allowed_formats: undefined, // Cho phép mọi format
  format: undefined, // Không force format
  tags: ['document', 'upload'], // Thêm tags
  context: {
    alt: sanitizedFileName,
    caption: `Uploaded document: ${sanitizedFileName}`
  }
};
```

### 2. Cải thiện Error Handling

Đã thêm log chi tiết khi có lỗi:

- Log HTTP code
- Log error name và message
- Log error response
- Xử lý lỗi "untrusted" cụ thể
- Hướng dẫn khắc phục

### 3. Log Upload Options

Đã thêm log các options trước khi upload để debug dễ hơn.

## 📋 So sánh Test vs Frontend

| Aspect | Test Script | Frontend |
|--------|-------------|----------|
| **Method** | `uploadFileToCloudinary(filePath, ...)` | `uploadFileToCloudinary(file.path, ...)` |
| **File Source** | Direct file path | Multer saved file |
| **Upload Options** | ✅ Giống nhau | ✅ Giống nhau |
| **Error Handling** | ✅ Cải thiện | ✅ Cải thiện |

## 🧪 Test

### Chạy test script:
```bash
node api/test-frontend-upload.js
```

### Kết quả mong đợi:
```
✅ Upload successful!
✅ Cloudinary URL found!
   URL: https://res.cloudinary.com/...
   Public ID: documents/doc_xxx/file.pdf
```

## 🚨 Troubleshooting

### Nếu vẫn gặp lỗi "Customer is marked as untrusted":

1. **Kiểm tra Cloudinary Dashboard**:
   - Vào Settings → Security
   - Kiểm tra Access Control settings
   - Đảm bảo không có restrictions

2. **Kiểm tra API Credentials**:
   ```bash
   # Kiểm tra .env file
   cat .env | grep CLOUDINARY
   
   # Phải có:
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   ```

3. **Kiểm tra Account Status**:
   - Đăng nhập Cloudinary Dashboard
   - Kiểm tra account không bị limit hoặc restrict

4. **Kiểm tra Backend Logs**:
   ```bash
   # Xem log khi upload
   # Phải thấy:
   ✅ File uploaded successfully!
   Public ID: documents/...
   URL: https://res.cloudinary.com/...
   ```

## 💡 Lưu ý

1. **File được upload với `access_mode: 'public'`** - đảm bảo file có thể truy cập công khai
2. **File được upload với `type: 'upload'`** - đảm bảo không phải private
3. **File được lưu trong folder `documents/`** - dễ quản lý
4. **File có tags `['document', 'upload']`** - dễ tìm kiếm

## 📝 Code Changes

### File: `api/cloudinary-upload.js`

1. **Function `uploadFileToCloudinary`**:
   - Thêm uploadOptions object với đầy đủ options
   - Thêm log upload options
   - Cải thiện error handling

2. **Function `uploadFileBufferToCloudinary`**:
   - Thêm uploadOptions object
   - Thêm log upload options
   - Cải thiện error handling trong upload_stream callback

## ✅ Kết luận

Code đã được cải thiện để:
- ✅ Upload với options đầy đủ
- ✅ Error handling tốt hơn
- ✅ Log chi tiết để debug
- ✅ Xử lý lỗi "untrusted" cụ thể

**Flow upload từ frontend giờ đã giống như test và sẽ hoạt động tốt hơn!**

