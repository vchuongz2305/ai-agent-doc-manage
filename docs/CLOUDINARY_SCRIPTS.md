# Hướng dẫn sử dụng Cloudinary Scripts

## Tổng quan

Các script này cho phép upload và download file PDF lên/xuống Cloudinary trực tiếp từ backend, **không cần dùng n8n nodes**. Điều này giúp tránh lỗi khi truyền file qua URL webhook.

---

## Cài đặt

### 1. Cài đặt package

```bash
npm install cloudinary
```

### 2. Cấu hình Environment Variables

Thêm vào file `.env`:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Lấy thông tin từ Cloudinary Dashboard:**
1. Đăng nhập: https://cloudinary.com/console
2. Vào **Settings** → **Security**
3. Copy **Cloud Name**, **API Key**, **API Secret**

---

## Script 1: Upload File lên Cloudinary

### File: `api/cloudinary-upload.js`

### Cách sử dụng trong code:

```javascript
const { uploadFileToCloudinary, uploadFileBufferToCloudinary } = require('./api/cloudinary-upload');

// Cách 1: Upload từ file path
const result = await uploadFileToCloudinary(
  './uploads/document.pdf',  // File path
  'doc_123456789',            // Processing ID
  'document.pdf'               // File name
);

console.log(result.secure_url); // URL của file trên Cloudinary

// Cách 2: Upload từ buffer (không cần lưu file tạm)
const fileBuffer = fs.readFileSync('./uploads/document.pdf');
const result = await uploadFileBufferToCloudinary(
  fileBuffer,                  // Buffer của file
  'doc_123456789',            // Processing ID
  'document.pdf',              // File name
  'application/pdf'            // MIME type
);
```

### Sử dụng từ command line:

```bash
# Upload file
node api/cloudinary-upload.js <filePath> <processingId> <fileName>

# Ví dụ:
node api/cloudinary-upload.js ./uploads/test.pdf doc_123 test.pdf
```

### Kết quả:

```json
{
  "success": true,
  "public_id": "documents/doc_123/test.pdf",
  "secure_url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/documents/doc_123/test.pdf",
  "url": "http://res.cloudinary.com/your-cloud/image/upload/v1234567890/documents/doc_123/test.pdf",
  "bytes": 1024000,
  "format": "pdf",
  "resource_type": "raw",
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

## Script 2: Download File từ Cloudinary

### File: `api/cloudinary-download.js`

### Cách sử dụng trong code:

```javascript
const { 
  downloadFileFromCloudinary, 
  downloadFileFromCloudinaryUrl,
  getFileInfoFromCloudinary 
} = require('./api/cloudinary-download');

// Cách 1: Download bằng public_id
const result = await downloadFileFromCloudinary(
  'documents/doc_123/test.pdf',  // Public ID
  './downloads/test.pdf'          // Output path (optional)
);

console.log(result.buffer); // Buffer của file
console.log(result.size);   // Size của file

// Cách 2: Download bằng URL
const result = await downloadFileFromCloudinaryUrl(
  'https://res.cloudinary.com/your-cloud/image/upload/v1234567890/documents/doc_123/test.pdf',
  './downloads/test.pdf'
);

// Cách 3: Lấy thông tin file (không download)
const info = await getFileInfoFromCloudinary('documents/doc_123/test.pdf');
console.log(info.bytes); // Size của file
```

### Sử dụng từ command line:

```bash
# Download bằng public_id
node api/cloudinary-download.js <publicId> [outputPath]

# Ví dụ:
node api/cloudinary-download.js documents/doc_123/test.pdf ./downloads/test.pdf

# Download bằng URL
node api/cloudinary-download.js https://res.cloudinary.com/... ./downloads/test.pdf
```

### Kết quả:

```json
{
  "success": true,
  "buffer": <Buffer ...>,
  "size": 1024000,
  "public_id": "documents/doc_123/test.pdf",
  "url": "https://res.cloudinary.com/...",
  "saved": true,
  "outputPath": "./downloads/test.pdf"
}
```

---

## Tích hợp vào Backend API

### Ví dụ: Upload file sau khi nhận từ frontend

```javascript
// api/unified-document-agent.js
const { uploadFileToCloudinary } = require('./cloudinary-upload');

app.post('/api/document/process', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { userId, department } = req.body;
    
    // Generate processing ID
    const processingId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Upload file lên Cloudinary
    const cloudinaryResult = await uploadFileToCloudinary(
      file.path,           // File path từ multer
      processingId,        // Processing ID
      file.originalname    // Original file name
    );
    
    // Lưu metadata vào database
    // ... database code ...
    
    // Gửi đến n8n webhook với Cloudinary URL thay vì file path
    const webhookData = {
      file: {
        name: file.originalname,
        url: cloudinaryResult.secure_url,  // Dùng Cloudinary URL
        cloudinary_public_id: cloudinaryResult.public_id
      },
      userId: userId,
      department: department,
      processingId: processingId
    };
    
    // Gửi đến n8n
    await axios.post(FLOW1_URL, webhookData);
    
    res.json({ 
      success: true, 
      processingId: processingId,
      cloudinaryUrl: cloudinaryResult.secure_url
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Ví dụ: Download file từ Cloudinary khi cần

```javascript
// api/unified-document-agent.js
const { downloadFileFromCloudinary } = require('./cloudinary-download');

app.get('/api/document/download/:processingId', async (req, res) => {
  try {
    const { processingId } = req.params;
    
    // Lấy public_id từ database
    const doc = await db.query(
      'SELECT cloudinary_public_id FROM documents WHERE processing_id = $1',
      [processingId]
    );
    
    if (!doc.rows[0] || !doc.rows[0].cloudinary_public_id) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Download file từ Cloudinary
    const result = await downloadFileFromCloudinary(
      doc.rows[0].cloudinary_public_id
    );
    
    // Trả về file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${processingId}.pdf"`);
    res.send(result.buffer);
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## Workflow mới (không dùng n8n Cloudinary nodes)

### Trước đây (dùng n8n nodes):
```
Webhook → Set File Data → Download File From URL → Upload to Cloudinary → Get from Cloudinary → Extract PDF
```

### Bây giờ (dùng backend scripts):
```
Frontend → Backend API
  ↓
Backend upload file lên Cloudinary (script)
  ↓
Backend gửi Cloudinary URL đến n8n webhook
  ↓
n8n workflow chỉ cần download từ Cloudinary URL (HTTP Request node)
  ↓
Extract PDF Text
```

### Lợi ích:
- ✅ **Tránh lỗi binary data** qua webhook
- ✅ **File được upload ngay** từ backend
- ✅ **n8n workflow đơn giản hơn** (chỉ cần HTTP Request)
- ✅ **Dễ debug** hơn (có thể test script riêng)
- ✅ **Không cần cấu hình Cloudinary credentials trong n8n**

---

## Cập nhật Database Schema

Thêm cột `cloudinary_public_id` để lưu public_id:

```sql
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS cloudinary_public_id VARCHAR(500);

-- Index cho tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_documents_cloudinary_public_id 
ON documents(cloudinary_public_id) 
WHERE cloudinary_public_id IS NOT NULL;
```

---

## Testing

### Test upload:

```bash
# Tạo file test
echo "Test PDF content" > test.pdf

# Upload
node api/cloudinary-upload.js test.pdf test_123 test.pdf

# Kiểm tra kết quả
# Copy public_id từ output
```

### Test download:

```bash
# Download bằng public_id
node api/cloudinary-download.js documents/test_123/test.pdf ./downloaded.pdf

# Kiểm tra file
ls -lh downloaded.pdf
```

---

## Troubleshooting

### Lỗi: "Cloudinary credentials not configured"
- ✅ Kiểm tra file `.env` có đầy đủ 3 biến: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- ✅ Restart server sau khi thêm `.env`

### Lỗi: "File not found"
- ✅ Kiểm tra file path có đúng không
- ✅ Kiểm tra file có tồn tại không

### Lỗi: "File too large"
- ✅ Cloudinary free plan giới hạn 10MB/file
- ✅ Nếu file lớn hơn, cần upgrade plan hoặc compress file

### Lỗi: "Public ID already exists"
- ✅ Public ID phải unique
- ✅ Script tự động tạo folder structure: `documents/{processingId}/{filename}`
- ✅ Đảm bảo processingId là unique

---

## Best Practices

1. ✅ **Luôn dùng processingId** để tạo folder structure
2. ✅ **Sanitize filename** trước khi upload (script tự động làm)
3. ✅ **Lưu public_id vào database** để dễ download sau
4. ✅ **Xóa file local** sau khi upload thành công (nếu không cần)
5. ✅ **Handle errors** properly trong production

---

## Tài liệu tham khảo

- [Cloudinary Node.js SDK](https://cloudinary.com/documentation/node_integration)
- [Cloudinary Upload API](https://cloudinary.com/documentation/image_upload_api_reference)
- [Cloudinary Download API](https://cloudinary.com/documentation/image_transformation_reference)

