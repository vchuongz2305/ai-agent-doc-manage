# Cloudinary Scripts - Quick Start

## 📦 Đã cài đặt
- ✅ `cloudinary` package đã được cài đặt
- ✅ Scripts đã được tạo: `cloudinary-upload.js` và `cloudinary-download.js`

## ⚙️ Cấu hình

Thêm vào file `.env`:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## 🚀 Sử dụng nhanh

### Upload file:
```bash
node api/cloudinary-upload.js ./uploads/test.pdf doc_123 test.pdf
```

### Download file:
```bash
node api/cloudinary-download.js documents/doc_123/test.pdf ./downloads/test.pdf
```

## 💻 Sử dụng trong code:

```javascript
const { uploadFileToCloudinary } = require('./api/cloudinary-upload');

const result = await uploadFileToCloudinary(
  './uploads/file.pdf',
  'doc_123',
  'file.pdf'
);

console.log(result.secure_url); // URL của file
```

## 📚 Xem chi tiết:
- `docs/CLOUDINARY_SCRIPTS.md` - Hướng dẫn đầy đủ
- `api/cloudinary-integration-example.js` - Ví dụ tích hợp

