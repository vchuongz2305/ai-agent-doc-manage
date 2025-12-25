# Tích hợp Cloudinary hoàn chỉnh - Hướng dẫn

## ✅ Đã hoàn thành

### Bước 1: Tích hợp Cloudinary upload vào Backend ✅
- File: `api/unified-document-agent.js`
- Tự động upload file lên Cloudinary khi nhận từ frontend
- Lưu Cloudinary URL và public_id vào processing status
- Gửi Cloudinary URL đến n8n webhook (thay vì file path)

### Bước 2: Tạo Endpoint API mới ✅
- `POST /api/cloudinary/upload` - Upload file lên Cloudinary
- `GET /api/cloudinary/download/:publicId` - Download file từ Cloudinary bằng public_id
- `GET /api/cloudinary/download-url?url=...` - Download file từ Cloudinary URL
- `GET /api/cloudinary/info/:publicId` - Lấy thông tin file từ Cloudinary

### Bước 3: Cập nhật Workflow N8N ✅
- File: `workflows/Flow 1.json`
- Bỏ các node Cloudinary không cần thiết (Upload/Get từ Cloudinary)
- Cập nhật "Set File Data" để lưu cloudinary_url
- Cập nhật "Download File From URL" để ưu tiên Cloudinary URL
- Cập nhật "Save Analysis to Postgres" để lưu cloudinary_url từ Set File Data

---

## 🔄 Workflow mới

### Trước đây:
```
Frontend → Backend → n8n Webhook
  ↓
Set File Data → Download File From URL → Upload to Cloudinary → Get from Cloudinary → Extract PDF
```

### Bây giờ:
```
Frontend → Backend (upload lên Cloudinary) → n8n Webhook (với Cloudinary URL)
  ↓
Set File Data → Download File From URL (từ Cloudinary) → Extract PDF
```

**Lợi ích:**
- ✅ File được upload ngay từ backend (không cần qua n8n)
- ✅ Tránh lỗi binary data qua webhook
- ✅ Workflow n8n đơn giản hơn (bỏ 2 nodes)
- ✅ Nhanh hơn (không cần upload/download nhiều lần)

---

## 📋 Cách sử dụng

### 1. Upload file từ Frontend (tự động)

Khi frontend gửi file đến `/api/document/process`, backend sẽ:
1. Nhận file từ multer
2. Upload file lên Cloudinary tự động
3. Gửi Cloudinary URL đến n8n webhook
4. n8n download file từ Cloudinary URL và xử lý

**Không cần thay đổi gì ở frontend!**

### 2. Upload file qua API mới

```bash
curl -X POST http://localhost:5000/api/cloudinary/upload \
  -F "file=@./uploads/test.pdf" \
  -F "processingId=doc_123" \
  -F "fileName=test.pdf"
```

**Response:**
```json
{
  "success": true,
  "processingId": "doc_123",
  "fileName": "test.pdf",
  "cloudinary": {
    "public_id": "documents/doc_123/test.pdf",
    "secure_url": "https://res.cloudinary.com/...",
    "url": "http://res.cloudinary.com/...",
    "bytes": 1024000,
    "format": "pdf",
    "resource_type": "raw"
  }
}
```

### 3. Download file từ Cloudinary

```bash
# Download bằng public_id
curl http://localhost:5000/api/cloudinary/download/documents/doc_123/test.pdf \
  -o downloaded.pdf

# Download bằng URL
curl "http://localhost:5000/api/cloudinary/download-url?url=https://res.cloudinary.com/..." \
  -o downloaded.pdf
```

### 4. Lấy thông tin file

```bash
curl http://localhost:5000/api/cloudinary/info/documents/doc_123/test.pdf
```

**Response:**
```json
{
  "success": true,
  "info": {
    "public_id": "documents/doc_123/test.pdf",
    "secure_url": "https://res.cloudinary.com/...",
    "bytes": 1024000,
    "format": "pdf",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

## 🔧 Cấu hình

### Environment Variables

Đảm bảo file `.env` có:

```env
CLOUDINARY_CLOUD_NAME=diaogiqvy
CLOUDINARY_API_KEY=275153643541523
CLOUDINARY_API_SECRET=P9W2BL8sXEMxfDsF40tmpY__2a8
```

### Test kết nối

```bash
node api/test-cloudinary-connection.js
```

---

## 📊 Database Schema

Workflow sẽ lưu `cloudinary_url` vào database:

```sql
-- Đã có sẵn trong create_documents_table.sql
cloudinary_url TEXT
```

Workflow sẽ tự động lưu Cloudinary URL từ "Set File Data" node.

---

## 🐛 Troubleshooting

### Lỗi: "Failed to upload file to Cloudinary"
- ✅ Kiểm tra credentials trong `.env`
- ✅ Kiểm tra file có tồn tại không
- ✅ Kiểm tra file size (Cloudinary free plan giới hạn 10MB/file)

### Lỗi: "File not found" trong n8n
- ✅ Kiểm tra Cloudinary URL có đúng không
- ✅ Kiểm tra file đã được upload lên Cloudinary chưa
- ✅ Xem execution logs trong n8n

### Workflow không chạy
- ✅ Import lại workflow `Flow 1.json` vào n8n
- ✅ Activate workflow
- ✅ Kiểm tra webhook URL có đúng không

---

## 📝 Thay đổi trong Code

### `api/unified-document-agent.js`

**Thêm imports:**
```javascript
const { uploadFileToCloudinary } = require('./cloudinary-upload');
const { downloadFileFromCloudinary, downloadFileFromCloudinaryUrl } = require('./cloudinary-download');
```

**Thêm upload trong POST /api/document/process:**
- Upload file lên Cloudinary sau khi nhận từ frontend
- Lưu Cloudinary URL vào processing status
- Gửi Cloudinary URL đến n8n webhook

**Thêm endpoints mới:**
- `POST /api/cloudinary/upload`
- `GET /api/cloudinary/download/:publicId`
- `GET /api/cloudinary/download-url`
- `GET /api/cloudinary/info/:publicId`

### `workflows/Flow 1.json`

**Cập nhật "Set File Data":**
- Thêm field `cloudinary_url`
- Thêm field `cloudinary_public_id`

**Cập nhật "Download File From URL":**
- Ưu tiên download từ `cloudinary_url` nếu có
- Fallback về `file_url` nếu không có Cloudinary URL

**Bỏ các node:**
- "Upload File to Cloudinary" (không cần nữa)
- "Get File from Cloudinary" (không cần nữa)

**Cập nhật "Save Analysis to Postgres":**
- Lưu `cloudinary_url` từ "Set File Data" thay vì từ "Upload File to Cloudinary"

---

## ✅ Checklist

- [x] Cloudinary credentials đã được cấu hình
- [x] Scripts upload/download đã được tạo
- [x] Backend tự động upload file lên Cloudinary
- [x] Endpoint API mới đã được tạo
- [x] Workflow n8n đã được cập nhật
- [x] Database schema đã có cloudinary_url column
- [x] Test kết nối Cloudinary thành công

---

## 🚀 Next Steps

1. **Import workflow vào n8n:**
   - Mở n8n: https://n8n.aidocmanageagent.io.vn
   - Import file `workflows/Flow 1.json`
   - Activate workflow

2. **Test workflow:**
   - Gửi file từ frontend
   - Kiểm tra file đã upload lên Cloudinary
   - Kiểm tra workflow n8n chạy thành công

3. **Monitor:**
   - Kiểm tra Cloudinary dashboard
   - Kiểm tra execution logs trong n8n
   - Kiểm tra database có lưu cloudinary_url

---

## 📚 Tài liệu tham khảo

- `docs/CLOUDINARY_SCRIPTS.md` - Hướng dẫn sử dụng scripts
- `api/cloudinary-integration-example.js` - Ví dụ tích hợp
- `api/test-cloudinary-connection.js` - Test kết nối

