# Sửa lỗi: Bắt buộc dùng Cloudinary khi upload từ frontend

## 🔍 Vấn đề

Khi upload file từ frontend, backend không upload lên Cloudinary và fallback về local URL:
- `cloudinary_url` = `https://api.aidocmanageagent.io.vn/uploads/...` (sai - phải là Cloudinary URL)
- `cloudinary_public_id` = `[null]` (sai - phải có public_id)

**Nguyên nhân:** Code có try-catch và fallback về local URL khi Cloudinary upload fail.

## ✅ Đã sửa

### 1. Bắt buộc upload lên Cloudinary
- **Trước:** Nếu Cloudinary upload fail → fallback về local URL
- **Sau:** Nếu Cloudinary upload fail → throw error, không tiếp tục

### 2. Verify Cloudinary URL
- Kiểm tra Cloudinary URL có hợp lệ không (phải chứa "cloudinary.com")
- Nếu không hợp lệ → throw error

### 3. Chỉ dùng Cloudinary URL
- **Trước:** `url: cloudinaryUrl || localUrl` (có thể dùng local URL)
- **Sau:** `url: cloudinaryUrl` (chỉ dùng Cloudinary URL)

### 4. Log chi tiết
- Log đầy đủ thông tin khi upload
- Log error chi tiết nếu upload fail
- Verify URL trước khi gửi đến webhook

---

## 📋 Thay đổi trong code

### `api/unified-document-agent.js`

**Trước:**
```javascript
try {
  cloudinaryResult = await uploadFileToCloudinary(...);
  cloudinaryUrl = cloudinaryResult.secure_url;
} catch (cloudinaryError) {
  console.warn(`⚠️ Continuing with local file URL...`);
  // Continue with local URL
}

const fileUrl = cloudinaryUrl || `https://api.aidocmanageagent.io.vn/uploads/${fileName}`;
```

**Sau:**
```javascript
try {
  cloudinaryResult = await uploadFileToCloudinary(...);
  cloudinaryUrl = cloudinaryResult.secure_url;
  
  if (!cloudinaryUrl) {
    throw new Error('Cloudinary URL is missing');
  }
} catch (cloudinaryError) {
  console.error(`❌ CRITICAL: Failed to upload file to Cloudinary!`);
  return res.status(500).json({ 
    error: 'Failed to upload file to Cloudinary',
    message: cloudinaryError.message
  });
}

// Verify URL
if (!cloudinaryUrl.includes('cloudinary.com')) {
  return res.status(500).json({ 
    error: 'Invalid Cloudinary URL'
  });
}

// CHỈ dùng Cloudinary URL
const fileUrl = cloudinaryUrl;
```

---

## ✅ Kết quả

### Trước (có lỗi):
```json
{
  "file": {
    "url": "https://api.aidocmanageagent.io.vn/uploads/...",
    "cloudinary_url": "https://api.aidocmanageagent.io.vn/uploads/...",
    "cloudinary_public_id": null
  }
}
```

### Sau (đã sửa):
```json
{
  "file": {
    "url": "https://res.cloudinary.com/diaogiqvy/raw/upload/...",
    "cloudinary_url": "https://res.cloudinary.com/diaogiqvy/raw/upload/...",
    "cloudinary_public_id": "documents/doc_123/file.pdf"
  }
}
```

---

## 🧪 Test

### Test upload từ frontend:
1. Upload file qua frontend
2. Kiểm tra backend logs:
   - ✅ Phải thấy "Uploading file to Cloudinary..."
   - ✅ Phải thấy "File uploaded to Cloudinary successfully!"
   - ✅ Phải thấy Cloudinary URL trong logs
3. Kiểm tra response:
   - ✅ `cloudinary_url` phải chứa "cloudinary.com"
   - ✅ `cloudinary_public_id` phải có giá trị

### Nếu upload fail:
- ✅ Backend sẽ trả về error 500
- ✅ Frontend sẽ nhận được error message
- ✅ Không tiếp tục với local URL

---

## 💡 Lưu ý

1. **Cloudinary credentials phải đúng:**
   - Kiểm tra `.env` có đầy đủ credentials
   - Test kết nối: `node api/test-cloudinary-connection.js`

2. **File size:**
   - Cloudinary free plan giới hạn 10MB/file
   - Nếu file lớn hơn → sẽ fail

3. **Error handling:**
   - Nếu Cloudinary upload fail → frontend sẽ nhận error
   - Không còn fallback về local URL

---

## ✅ Kết luận

- ✅ Backend bắt buộc upload lên Cloudinary
- ✅ Không còn fallback về local URL
- ✅ Verify URL trước khi gửi đến webhook
- ✅ Error handling rõ ràng

**Bước tiếp theo:** Test lại upload từ frontend và verify Cloudinary URL!

