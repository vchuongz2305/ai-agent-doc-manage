# Sửa Lỗi Upload File lên Cloudinary - Đảm bảo File Public

## 🔍 Vấn đề

- File được upload lên Cloudinary nhưng khi n8n workflow download thì bị lỗi 401 "Authorization failed"
- Lỗi: "Customer is marked as untrusted"
- File không thể truy cập công khai từ URL

## ✅ Đã sửa

### 1. Đơn giản hóa Upload Options

**Trước:** Nhiều options phức tạp có thể gây conflict:
```javascript
{
  access_mode: 'public',
  type: 'upload',
  allowed_formats: undefined,
  format: undefined,
  tags: [...],
  context: {...}
}
```

**Sau:** Chỉ giữ các options cần thiết:
```javascript
{
  public_id: publicId,
  resource_type: 'raw', // cho PDF
  folder: 'documents',
  overwrite: true,
  access_mode: 'public', // QUAN TRỌNG
  invalidate: true
}
```

### 2. Verify Upload Result

Đã thêm verify sau khi upload:
- Kiểm tra `result.secure_url` có tồn tại không
- Kiểm tra `result.access_mode` có là 'public' không
- Log chi tiết để debug

### 3. Loại bỏ Options không cần thiết

- ❌ Bỏ `type: 'upload'` (mặc định là upload)
- ❌ Bỏ `allowed_formats: undefined` (không cần)
- ❌ Bỏ `format: undefined` (không cần)
- ❌ Bỏ `tags` và `context` (có thể gây vấn đề)
- ✅ Chỉ giữ `access_mode: 'public'` - QUAN TRỌNG NHẤT

## 📋 Upload Options Hiện Tại

```javascript
const uploadOptions = {
  public_id: publicId,
  resource_type: 'raw', // cho PDF
  folder: 'documents',
  overwrite: true,
  access_mode: 'public', // QUAN TRỌNG: Đảm bảo file public
  invalidate: true // Invalidate CDN cache
};
```

## 🔍 Verify Upload

Sau khi upload, code sẽ verify:
1. ✅ `result.secure_url` có tồn tại
2. ✅ `result.access_mode === 'public'`
3. ✅ Log chi tiết để debug

## 🚨 Troubleshooting

### Nếu vẫn bị lỗi 401:

1. **Kiểm tra Cloudinary Dashboard**:
   - Settings → Security → Access Control
   - Đảm bảo không có restrictions
   - Kiểm tra "Allowed file types" - PDF phải được phép

2. **Kiểm tra Account Status**:
   - Account không bị limit
   - Account không bị đánh dấu "untrusted"
   - Thử upload file nhỏ để test

3. **Kiểm tra Backend Logs**:
   ```bash
   # Phải thấy:
   ✅ File uploaded successfully!
   Access Mode: public
   ```

4. **Test URL trực tiếp**:
   ```bash
   curl -I "https://res.cloudinary.com/diaogiqvy/raw/upload/v.../documents/..."
   # Phải trả về 200 OK, không phải 401
   ```

## 💡 Lưu Ý

1. **Chỉ dùng `access_mode: 'public'`** - đây là option quan trọng nhất
2. **Đơn giản hóa options** - không thêm options không cần thiết
3. **Verify sau upload** - kiểm tra file có public không
4. **Log chi tiết** - để debug khi có vấn đề

## ✅ Kết luận

Code đã được đơn giản hóa và chỉ giữ các options cần thiết để đảm bảo file được upload với `access_mode: 'public'`. File sẽ có thể download được từ URL công khai.

