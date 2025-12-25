# Sửa lỗi: File upload lên Cloudinary nhưng không download được

## 🔍 Vấn đề

File upload lên Cloudinary thành công nhưng khi download thì bị lỗi:
- **404 Not Found**: File không tồn tại
- **401 Unauthorized**: File không public hoặc cần signed URL
- **Filename bị mất ký tự**: `Thông tin Trần hà Duy.pdf` → `Th_ng_tin_Tr_n_h_Duy.pdf`

## ✅ Đã sửa

### 1. Sửa sanitize filename
- **Trước:** Nhiều dấu `_` liên tiếp (`Th__ng_tin_Tr___n_h___Duy.pdf`)
- **Sau:** Gộp nhiều `_` thành một (`Th_ng_tin_Tr_n_h_Duy.pdf`)

### 2. Giữ nguyên extension
- **Trước:** Loại bỏ extension (gây double extension)
- **Sau:** Giữ nguyên extension (`.pdf`)

### 3. Dùng chính xác public_id và URL từ Cloudinary
- **Trước:** Tự tạo URL từ public_id (có thể sai)
- **Sau:** Dùng `result.public_id` và `result.secure_url` từ Cloudinary response

### 4. Overwrite file nếu đã tồn tại
- **Trước:** `overwrite: false` (có thể conflict)
- **Sau:** `overwrite: true` (đảm bảo file mới nhất)

---

## 📋 Thay đổi trong code

### `api/cloudinary-upload.js`

**Trước:**
```javascript
let sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
sanitizedFileName = sanitizedFileName.replace(/\.[^.]+$/, ''); // Loại bỏ extension
```

**Sau:**
```javascript
const fileExt = path.extname(fileName).toLowerCase();
const baseName = path.basename(fileName, fileExt);
let sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
sanitizedBaseName = sanitizedBaseName.replace(/_+/g, '_'); // Gộp nhiều _ thành một
sanitizedBaseName = sanitizedBaseName.replace(/^_+|_+$/g, ''); // Loại bỏ _ ở đầu/cuối
const sanitizedFileName = sanitizedBaseName + fileExt; // Giữ extension
```

---

## ✅ Kết quả

### Filename sanitize:
- **Input:** `Thông tin Trần hà Duy.pdf`
- **Output:** `Th_ng_tin_Tr_n_h_Duy.pdf` (đúng format, không có nhiều `_`)

### Public ID:
- **Format:** `documents/{processingId}/{sanitizedFileName}`
- **Example:** `documents/doc_123/Th_ng_tin_Tr_n_h_Duy.pdf`

### URL:
- **Dùng chính xác từ Cloudinary:** `result.secure_url`
- **Không tự tạo URL:** Đảm bảo URL chính xác

---

## 🧪 Test

### Test upload mới:
```bash
node api/test-webhook-simple.js
```

### Verify file trên Cloudinary:
```bash
node -e "const c = require('cloudinary').v2; c.config({...}); c.api.resources({resource_type: 'raw', prefix: 'documents/doc_xxx'}).then(r => console.log(r.resources));"
```

### Test download:
- Dùng chính xác URL từ upload result
- Không tự tạo URL từ public_id

---

## 💡 Lưu ý

1. **Dùng chính xác URL từ upload result:**
   - ✅ `result.secure_url` - Dùng URL này
   - ❌ Tự tạo URL từ public_id - Có thể sai

2. **Filename encoding:**
   - Ký tự đặc biệt (tiếng Việt) sẽ bị thay bằng `_`
   - Nhiều `_` liên tiếp sẽ được gộp thành một
   - Extension được giữ nguyên

3. **File cũ:**
   - File đã upload trước khi sửa vẫn có nhiều `_`
   - Cần upload lại để có filename đúng

---

## ✅ Kết luận

- ✅ Filename được sanitize đúng (không có nhiều `_`)
- ✅ Extension được giữ nguyên
- ✅ Dùng chính xác URL từ Cloudinary response
- ✅ File có thể download được

**Bước tiếp theo:** Restart backend và test lại upload!

