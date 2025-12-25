# Hướng Dẫn Export DOCX và Upload Lên Cloudinary

## 🎯 Mục Đích

Sau khi phân tích PDF xong, workflow sẽ:
1. ✅ Tạo file DOCX từ nội dung phân tích (từ Google Docs)
2. ✅ Upload file DOCX lên Cloudinary
3. ✅ Lưu URL của file DOCX vào PostgreSQL
4. ✅ Trả về URL cho frontend để hiển thị/download

## 📋 Workflow Mới

### Flow:
```
Google Docs1 (đã có nội dung phân tích)
→ Export Google Docs to DOCX
→ Upload DOCX to Cloudinary
→ Extract DOCX URL
→ Save Analysis to Postgres (với docx_url)
→ Google Drive1
→ Respond to Webhook
```

## 🔧 Các Node Mới

### 1. Export Google Docs to DOCX

**Node Type:** `n8n-nodes-base.googleDrive`
**Operation:** `download`
**Settings:**
- **File ID:** `={{ $('Google Docs').item.json.id }}`
- **MIME Type:** `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **Output:** Binary data (file DOCX)

### 2. Upload DOCX to Cloudinary

**Node Type:** `n8n-nodes-base.httpRequest`
**Method:** `POST`
**URL:** `http://localhost:5000/api/cloudinary/upload`
**Settings:**
- **Body Type:** `multipart-form-data`
- **Binary Data:** `data` (từ node Export)
- **Form Fields:**
  - `processingId`: `={{ $('Set File Data').item.json.processingId }}`
  - `fileName`: `={{ $('Set File Data').item.json.name.replace(/\.pdf$/i, '') }}_Analysis.docx`

### 3. Extract DOCX URL

**Node Type:** `n8n-nodes-base.code`
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

// Merge với data từ Aggregate node
const aggregateData = $('Aggregate').item.json;

return [{
  json: {
    ...aggregateData,
    docx_url: docxUrl
  }
}];
```

## 🗄️ Database Update

### Thêm cột docx_url:

```sql
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS docx_url TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_docx_url 
ON documents(docx_url) WHERE docx_url IS NOT NULL;
```

**Chạy SQL:**
```bash
psql -U your_user -d your_database -f database/add_docx_url_column.sql
```

## 📝 Update PostgreSQL Query

**Node "Save Analysis to Postgres" cần update:**

```sql
INSERT INTO documents (
  processing_id, 
  file_name, 
  file_url, 
  user_id, 
  department, 
  status, 
  analysis_results, 
  cloudinary_url, 
  docx_url,  -- ✅ Thêm cột này
  created_at, 
  updated_at, 
  analysis_completed_at
) VALUES (
  '{{ $('Set File Data').item.json.processingId }}',
  '{{ $('Set File Data').item.json.name }}',
  '{{ $('Set File Data').item.json.file_url }}',
  '{{ $('Set File Data').item.json.userId }}',
  '{{ $('Set File Data').item.json.department }}',
  'completed',
  '{{ JSON.stringify($json).replace(/'/g, "''") }}'::jsonb,
  '{{ $('Set File Data').item.json.cloudinary_url || $('Set File Data').item.json.file_url }}',
  '{{ $json.docx_url || '' }}',  -- ✅ Thêm giá trị này
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (processing_id) DO UPDATE SET 
  status = 'completed',
  analysis_results = EXCLUDED.analysis_results,
  cloudinary_url = EXCLUDED.cloudinary_url,
  docx_url = EXCLUDED.docx_url,  -- ✅ Update docx_url
  updated_at = NOW(),
  analysis_completed_at = NOW()
RETURNING *;
```

## 🔄 Backend API Update

### Update Response để trả về docx_url:

**File:** `api/unified-document-agent.js`

Cần update endpoint `/api/document/status/:id` để trả về `docx_url`:

```javascript
// Trong GET /api/document/status/:id
const status = processingStatus.get(processingId);
if (status) {
  res.json({
    ...status,
    docx_url: status.docx_url || null  // ✅ Thêm docx_url
  });
}
```

## 🎨 Frontend Update

### Hiển thị DOCX URL trong UI:

**File:** `frontend/src/App.jsx`

Thêm button để download DOCX:

```jsx
{status?.docx_url && (
  <div className="result-card">
    <h3>📄 Analysis Document</h3>
    <a 
      href={status.docx_url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="btn"
    >
      📥 Download Analysis DOCX
    </a>
  </div>
)}
```

## ✅ Workflow Hoàn Chỉnh

```
Webhook
→ Set File Data
→ Download File From URL
→ Extract PDF Text
→ comprehensive_analysis (1 node AI) ✅
→ Parse Combined Result
→ Merge
→ Aggregate
→ Google Docs (tạo document)
→ Google Drive (move)
→ Google Docs1 (insert content)
→ Export Google Docs to DOCX ✅ NEW
→ Upload DOCX to Cloudinary ✅ NEW
→ Extract DOCX URL ✅ NEW
→ Save Analysis to Postgres (với docx_url) ✅ UPDATED
→ Google Drive1
→ Respond to Webhook (với docx_url) ✅ UPDATED
```

## 🧪 Test

1. **Upload file PDF** từ frontend
2. **Kiểm tra workflow execution** trong n8n
3. **Verify:**
   - ✅ File DOCX được export từ Google Docs
   - ✅ File DOCX được upload lên Cloudinary
   - ✅ URL được lưu vào PostgreSQL
   - ✅ URL được trả về trong webhook response

## 📊 Kết Quả

Sau khi hoàn thành:
- ✅ File DOCX chứa nội dung phân tích đầy đủ
- ✅ File DOCX được lưu trên Cloudinary
- ✅ URL được lưu trong database
- ✅ Frontend có thể download/display file DOCX

## 🚨 Lưu Ý

1. **Google Drive API** cần có quyền export file
2. **Cloudinary** hỗ trợ DOCX với `resource_type: 'raw'`
3. **Backend API** cần chạy để nhận upload request
4. **Database** cần có cột `docx_url`

