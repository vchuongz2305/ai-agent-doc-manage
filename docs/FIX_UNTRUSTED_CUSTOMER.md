# Sửa Lỗi "Customer is marked as untrusted" trong Cloudinary

## 🔍 Vấn đề

Khi upload file lên Cloudinary, file bị block với thông báo:
- ❌ **"Customer is marked as untrusted"**
- ❌ **"Access control: Blocked for delivery"**
- ❌ **Lỗi 401 khi download file**

## ✅ Giải pháp

### Bước 1: Kiểm tra Cloudinary Dashboard Settings

1. **Đăng nhập Cloudinary Dashboard**: https://cloudinary.com/console

2. **Vào Settings → Security**:
   - Tìm phần **"Access control"** hoặc **"Untrusted customers"**
   - **TẮT** (disable) tùy chọn **"Block untrusted customers"** hoặc **"Restrict untrusted uploads"**
   - Lưu thay đổi

3. **Vào Settings → Upload**:
   - Kiểm tra **"Allowed file types"** - đảm bảo PDF được phép
   - Kiểm tra **"Max file size"** - đảm bảo đủ lớn cho file của bạn
   - Kiểm tra **"Moderation"** - có thể tắt nếu không cần

4. **Vào Settings → Usage**:
   - Kiểm tra xem account có bị giới hạn không
   - Nếu là free account, có thể có giới hạn về raw file uploads

### Bước 2: Tạo Unsigned Upload Preset (Khuyến nghị)

1. **Vào Settings → Upload** → **Upload presets**

2. **Tạo preset mới**:
   - **Preset name**: `unsigned-document-upload` (hoặc tên bạn muốn)
   - **Signing mode**: **Unsigned** ✅
   - **Folder**: `documents`
   - **Resource type**: `Raw` (cho PDF)
   - **Access mode**: **Public** ✅
   - **Moderation**: **None** (không cần moderation)
   - **Overwrite**: ✅ Enable

3. **Lưu preset**

4. **Cập nhật code** (nếu cần):
   - Thêm `upload_preset: 'unsigned-document-upload'` vào upload options
   - Hoặc dùng preset này trong frontend upload

### Bước 3: Fix các file đã bị block

Nếu có file đã bị block, có thể fix bằng cách:

1. **Vào Media Library** trong Cloudinary Dashboard
2. **Chọn file bị block**
3. **Click "Edit"** hoặc **"Manage"**
4. **Vào tab "Access"** hoặc **"Settings"**
5. **Thay đổi "Access control"** từ "Blocked" sang **"Public"**
6. **Lưu thay đổi**

Hoặc dùng API để update:
```javascript
await cloudinary.uploader.explicit(publicId, {
  resource_type: 'raw',
  type: 'upload',
  access_mode: 'public',
  overwrite: true,
  invalidate: true
});
```

### Bước 4: Verify Fix

1. **Upload file mới** từ frontend
2. **Kiểm tra Cloudinary Dashboard**:
   - File không còn bị "Blocked for delivery"
   - Access control là "Public"
3. **Test download**:
   - Copy URL từ Cloudinary Dashboard
   - Mở URL trong browser - phải download được file

## 🚨 Nếu vẫn không được

### Kiểm tra Account Status:

1. **Cloudinary Dashboard** → **Account Settings**
2. **Kiểm tra account type**: Free/Paid
3. **Kiểm tra limits**: Có thể account đã hết quota

### Liên hệ Cloudinary Support:

Nếu vẫn không fix được, có thể account bị flag bởi Cloudinary. Cần:
1. Gửi email đến support@cloudinary.com
2. Giải thích use case của bạn (document management)
3. Yêu cầu unblock account hoặc remove "untrusted" status

## ✅ Sau khi fix

Code đã được cập nhật để:
- ✅ Tự động force update `access_mode` sau khi upload
- ✅ Log chi tiết nếu file bị block
- ✅ Dùng signed URL nếu file không public
- ✅ Fallback về unsigned URL nếu signed URL fail

File mới upload sẽ tự động được fix nếu có thể. File cũ cần fix thủ công trong Dashboard hoặc dùng API update.

