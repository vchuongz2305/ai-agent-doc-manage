# Hướng Dẫn Export DOCX và Upload Lên Cloudinary

## 🎯 Mục Đích

Sau khi phân tích PDF xong, workflow sẽ:
1. ✅ Tạo file DOCX từ nội dung phân tích (từ Google Docs)
2. ✅ Upload file DOCX lên Cloudinary
3. ✅ Lưu URL của file DOCX vào PostgreSQL
4. ✅ Trả về URL cho frontend để hiển thị/download

## 📋 Các Bước Thực Hiện

### Bước 1: Update Database

Chạy SQL script để thêm cột `docx_url`:

```bash
psql -U your_user -d your_database -f database/add_docx_url_column.sql
```

Hoặc chạy trực tiếp:
```sql
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS docx_url TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_docx_url 
ON documents(docx_url) WHERE docx_url IS NOT NULL;
```

### Bước 2: Import Workflow Mới

1. Mở n8n: `https://n8n.aidocmanageagent.io.vn`
2. Click **"+"** → **"Import from File"**
3. Chọn file: `workflows/Flow 1 - With DOCX.json`
4. Click **"Import"**

### Bước 3: Kiểm Tra Workflow

Sau khi import, kiểm tra các node mới:

1. **"Export Google Docs to DOCX"**:
   - ✅ Operation: `download`
   - ✅ File ID: `={{ $('Google Docs').item.json.id }}`
   - ✅ MIME Type: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

2. **"Upload DOCX to Cloudinary"**:
   - ✅ Method: `POST`
   - ✅ URL: `http://localhost:5000/api/cloudinary/upload`
   - ✅ Body Type: `multipart-form-data`
   - ✅ Binary Property: `data`
   - ✅ Form Fields:
     - `processingId`: `={{ $('Set File Data').item.json.processingId }}`
     - `fileName`: `={{ $('Set File Data').item.json.name.replace(/\.pdf$/i, '') }}_Analysis.docx`

3. **"Extract DOCX URL"**:
   - ✅ Code node để extract URL từ Cloudinary response

4. **"Save Analysis to Postgres"**:
   - ✅ Query đã được update để lưu `docx_url`

### Bước 4: Kiểm Tra Connections

Workflow flow:
```
Google Docs1
→ Export Google Docs to DOCX
→ Upload DOCX to Cloudinary
→ Extract DOCX URL
→ Save Analysis to Postgres (với docx_url)
→ Google Drive1
→ Respond to Webhook (với docx_url)
```

### Bước 5: Test Workflow

1. **Activate workflow** (nếu chưa active)
2. **Upload file PDF** từ frontend
3. **Kiểm tra execution** trong n8n:
   - ✅ Export DOCX thành công
   - ✅ Upload lên Cloudinary thành công
   - ✅ URL được lưu vào PostgreSQL
4. **Kiểm tra frontend**:
   - ✅ Có button "Download Analysis DOCX"
   - ✅ URL hiển thị đúng

## 🔧 Cấu Hình Chi Tiết

### Node "Export Google Docs to DOCX"

**Settings:**
```json
{
  "operation": "download",
  "fileId": "={{ $('Google Docs').item.json.id }}",
  "options": {
    "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  }
}
```

### Node "Upload DOCX to Cloudinary"

**Settings:**
- **URL:** `http://localhost:5000/api/cloudinary/upload`
- **Method:** `POST`
- **Body Type:** `multipart-form-data`
- **Binary Data:** `data` (từ node Export)
- **Form Data:**
  - `file`: Binary data từ Export node
  - `processingId`: Processing ID
  - `fileName`: Tên file DOCX

### Node "Extract DOCX URL"

**Code:**
```javascript
// Lấy kết quả từ Upload DOCX node
const uploadResult = $json;

// Extract docx_url từ response
let docxUrl = '';

try {
  if (uploadResult.cloudinary && uploadResult.cloudinary.secure_url) {
    docxUrl = uploadResult.cloudinary.secure_url;
  } else if (uploadResult.secure_url) {
    docxUrl = uploadResult.secure_url;
  } else if (uploadResult.url) {
    docxUrl = uploadResult.url;
  }
  
  console.log('DOCX URL from Cloudinary:', docxUrl);
} catch (error) {
  console.error('Error extracting DOCX URL:', error);
}

// Lấy data từ Aggregate node (chứa analysis results)
const aggregateData = $('Aggregate').item.json || {};

// Merge với docx_url
return [{
  json: {
    ...aggregateData,
    docx_url: docxUrl
  }
}];
```

## 📊 Database Schema

**Cột mới:**
```sql
docx_url TEXT  -- URL của file DOCX trên Cloudinary
```

**Index:**
```sql
CREATE INDEX idx_documents_docx_url 
ON documents(docx_url) WHERE docx_url IS NOT NULL;
```

## 🎨 Frontend Update

Frontend đã được update để hiển thị button download DOCX khi có `docx_url`.

**Hiển thị:**
- Button "📥 Download Analysis DOCX"
- Link đến file DOCX trên Cloudinary
- URL hiển thị (truncated)

## ✅ Kết Quả

Sau khi hoàn thành:
- ✅ File DOCX chứa nội dung phân tích đầy đủ
- ✅ File DOCX được lưu trên Cloudinary
- ✅ URL được lưu trong database
- ✅ Frontend có thể download/display file DOCX
- ✅ URL có thể được call ra UI

## 🚨 Lưu Ý

1. **Backend API** phải chạy để nhận upload request từ n8n
2. **Cloudinary** hỗ trợ DOCX với `resource_type: 'raw'`
3. **Google Drive API** cần có quyền export file
4. **Database** cần có cột `docx_url`

## 🧪 Test Checklist

- [ ] Database có cột `docx_url`
- [ ] Workflow import thành công
- [ ] Export DOCX node hoạt động
- [ ] Upload DOCX lên Cloudinary thành công
- [ ] URL được lưu vào PostgreSQL
- [ ] Frontend hiển thị button download
- [ ] Có thể download file DOCX từ URL

