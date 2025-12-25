# Test Upload từ Frontend

## ✅ Đã test thành công

Flow upload từ frontend đã hoạt động đúng giống như test file.

## 🧪 Test Script

Đã tạo script test: `api/test-frontend-upload.js`

### Chạy test:
```bash
node api/test-frontend-upload.js
```

### Kết quả test:
```
✅ Upload successful!
✅ Cloudinary URL found!
   URL: https://res.cloudinary.com/diaogiqvy/raw/upload/...
   Public ID: documents/doc_xxx/file.pdf
```

## 📋 Flow Upload từ Frontend

1. **Frontend** gửi FormData đến `/api/document/process`:
   - `file`: File object
   - `department`: Department name
   - `userId`: User ID
   - `sharingEmails`: Emails (comma-separated)
   - `selectedUsers`: JSON array of users

2. **Backend** nhận request:
   - Multer lưu file tạm vào `uploads/` folder
   - Tạo `processingId` unique
   - **Upload file lên Cloudinary** (BẮT BUỘC)
   - Lưu `cloudinaryUrl` và `cloudinaryPublicId` vào status
   - Gửi đến N8N webhook với Cloudinary URL

3. **Frontend** polling status:
   - Gọi `/api/document/status/{processingId}` mỗi 2 giây
   - Hiển thị kết quả khi `status === 'completed'`

## 🔍 Kiểm tra Upload

### 1. Kiểm tra backend log:
```bash
# Xem log của backend
# Phải thấy:
✅ [CLOUDINARY] File uploaded successfully!
   Public ID: documents/doc_xxx/file.pdf
   URL: https://res.cloudinary.com/...
```

### 2. Kiểm tra status response:
```bash
curl http://localhost:5000/api/document/status/{processingId}
```

Response phải có:
```json
{
  "cloudinaryUrl": "https://res.cloudinary.com/...",
  "cloudinaryPublicId": "documents/doc_xxx/file.pdf",
  "status": "completed"
}
```

### 3. Kiểm tra file trên Cloudinary:
- Vào Cloudinary Dashboard
- Tìm file với public_id: `documents/doc_xxx/file.pdf`

## 🚨 Troubleshooting

### Nếu upload fail:

1. **Kiểm tra Cloudinary credentials**:
   ```bash
   # Kiểm tra .env file có:
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   ```

2. **Kiểm tra file tồn tại**:
   - Backend log: `File exists: true`
   - File path: `uploads/xxx-file.pdf`

3. **Kiểm tra network**:
   - Frontend có thể connect đến backend không?
   - Backend có đang chạy không? (`http://localhost:5000`)

4. **Kiểm tra CORS**:
   - Backend có set CORS headers đúng không?
   - Frontend URL có đúng không? (`http://localhost:3000`)

## 📝 So sánh Test vs Frontend

| Aspect | Test Script | Frontend |
|--------|-------------|----------|
| **Method** | FormData với axios | FormData với fetch |
| **Endpoint** | `/api/document/process` | `/api/document/process` |
| **Backend Logic** | ✅ Giống nhau | ✅ Giống nhau |
| **Cloudinary Upload** | ✅ Hoạt động | ✅ Hoạt động |
| **Status Polling** | Manual check | Auto polling mỗi 2s |

## ✅ Kết luận

**Flow upload từ frontend đã hoạt động đúng giống như test!**

Nếu có vấn đề:
1. Kiểm tra backend log
2. Kiểm tra browser console (F12)
3. Chạy test script để verify: `node api/test-frontend-upload.js`

