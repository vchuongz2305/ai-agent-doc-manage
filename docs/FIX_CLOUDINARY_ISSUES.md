# Sửa lỗi Cloudinary Upload/Download

## ✅ Đã sửa các lỗi

### 1. Lỗi duplicate folder "documents/documents/" ✅
**Vấn đề:** Public ID có duplicate folder
- Trước: `documents/documents/test_123/file.pdf`
- Sau: `documents/test_123/file.pdf`

**Giải pháp:** Bỏ "documents/" khỏi public_id, chỉ dùng folder option

### 2. Lỗi double extension ".pdf.pdf" ✅
**Vấn đề:** File có double extension
- Trước: `test-document.pdf.pdf`
- Sau: `test-document.pdf`

**Giải pháp:** Loại bỏ extension khỏi filename trước khi upload (Cloudinary tự động thêm)

### 3. Lỗi resource_type sai ✅
**Vấn đề:** PDF bị lưu dưới dạng "image" thay vì "raw"
- Trước: `.../image/upload/...`
- Sau: `.../raw/upload/...`

**Giải pháp:** Tự động detect và dùng `raw` cho PDF và documents

### 4. Lỗi 401 (Access Denied) ✅
**Vấn đề:** File không public, không thể download
- Error: `401 - deny or ACL failure`

**Giải pháp:** Thêm `access_mode: 'public'` khi upload

---

## 📋 Thay đổi trong code

### `api/cloudinary-upload.js`

**Trước:**
```javascript
const publicId = `documents/${processingId}/${sanitizedFileName}`;
const result = await cloudinary.uploader.upload(filePath, {
  public_id: publicId,
  resource_type: 'auto',
  folder: 'documents',
  // ...
});
```

**Sau:**
```javascript
// Loại bỏ extension để tránh double extension
let sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
sanitizedFileName = sanitizedFileName.replace(/\.[^.]+$/, '');

// KHÔNG thêm "documents/" vào public_id
const publicId = `${processingId}/${sanitizedFileName}`;

// Xác định resource_type cho PDF
let resourceType = 'auto';
if (fileExt === '.pdf' || fileExt === '.doc' || ...) {
  resourceType = 'raw';
}

const result = await cloudinary.uploader.upload(filePath, {
  public_id: publicId,
  resource_type: resourceType, // raw cho PDF
  folder: 'documents',
  access_mode: 'public', // Đảm bảo file public
  type: 'upload',
  // ...
});
```

### `api/cloudinary-download.js`

**Cập nhật:** Tự động detect resource_type khi download
```javascript
let resourceType = 'raw';
if (publicId.includes('.pdf') || publicId.includes('documents/')) {
  resourceType = 'raw';
}
```

---

## ✅ Kết quả

### URL format đúng:
```
https://res.cloudinary.com/diaogiqvy/raw/upload/v1766633943/documents/test_1766633940752/test-document.pdf
```

- ✅ Không còn duplicate folder
- ✅ Không còn double extension
- ✅ Dùng `raw` cho PDF (đúng)
- ✅ File public (có thể download)

---

## 🧪 Test

### Test upload:
```bash
node api/test-webhook-simple.js
```

### Test download:
```bash
# Test với URL mới
curl -I "https://res.cloudinary.com/diaogiqvy/raw/upload/v1766633943/documents/test_1766633940752/test-document.pdf"
```

### Kết quả mong đợi:
- ✅ Status: 200 OK
- ✅ Content-Type: application/pdf
- ✅ File có thể download được

---

## 💡 Lưu ý

1. **File cũ vẫn có lỗi:** Các file đã upload trước khi sửa vẫn có duplicate folder và có thể không download được. Cần upload lại.

2. **Cloudinary Settings:** Đảm bảo Cloudinary account không có restrictions về access control.

3. **Resource Type:** 
   - PDF, DOC, XLS → `raw`
   - Images → `image` (auto)
   - Videos → `video` (auto)

---

## 🔄 Next Steps

1. ✅ Upload lại file test với script mới
2. ✅ Verify URL format đúng
3. ✅ Test download từ URL
4. ✅ Test trong n8n workflow

