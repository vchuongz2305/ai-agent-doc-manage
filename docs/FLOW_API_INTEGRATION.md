# Flow API Integration - Flow 2 và Flow 3 Gọi API

## 📋 Tổng Quan

Thay vì Flow 1 gửi trực tiếp dữ liệu đến Flow 2 và Flow 3, **Flow 1 chỉ trả về API endpoint URL**. Flow 2 và Flow 3 sẽ tự gọi API endpoint này để lấy dữ liệu từ PostgreSQL.

## ✅ Lợi Ích

1. **Decouple**: Flow 1 không cần biết Flow 2/3
2. **Retry**: Flow 2/3 có thể retry nếu API fail
3. **Dễ debug**: Có thể test API độc lập
4. **Flexible**: Nhiều consumer có thể gọi cùng API
5. **Reliable**: Không bị timeout khi Flow 2/3 xử lý lâu

## 🔄 Luồng Hoạt Động Mới

```
Flow 1: Document Analysis
├── Webhook nhận file
├── Extract PDF Text
├── AI Analysis (Gemini)
├── Parse Results
├── Save to PostgreSQL ✅
├── Get Data from PostgreSQL ✅
└── Respond to Webhook
    └── Trả về: { processingId, api_url, ... }
         └── API URL: https://api.aidocmanageagent.io.vn/api/document/get-from-postgres/{processingId}

Flow 2 & Flow 3:
├── Nhận processingId (từ webhook hoặc trigger khác)
├── Gọi API: GET /api/document/get-from-postgres/{processingId}
└── Nhận dữ liệu đầy đủ từ PostgreSQL
```

## 📊 Response từ Flow 1

Flow 1 trả về response với API URL:

```json
{
  "success": true,
  "processingId": "doc_1234567890_abc123",
  "message": "Document analysis completed",
  "file_url": "https://cloudinary.com/...",
  "analysis_results": {...},
  "api_url": "https://api.aidocmanageagent.io.vn/api/document/get-from-postgres/doc_1234567890_abc123",
  "note": "Flow 2 và Flow 3 có thể gọi API này để lấy dữ liệu đầy đủ"
}
```

## 🔧 Cấu Hình Flow 2 và Flow 3

### Cách 1: Flow 2/3 Nhận processingId từ Webhook

Nếu Flow 2/3 có webhook riêng nhận `processingId`:

1. **Thêm HTTP Request node** trong Flow 2/3:
   - Method: `GET`
   - URL: `https://api.aidocmanageagent.io.vn/api/document/get-from-postgres/{{ $json.processingId }}`
   - Headers: (không cần authentication nếu public)

2. **Sử dụng dữ liệu** từ API response:
   - `$json.data.processing_id`
   - `$json.data.file_name`
   - `$json.data.analysis_results`
   - etc.

### Cách 2: Flow 2/3 Trigger từ Flow 1 Response

Nếu Flow 2/3 được trigger từ Flow 1 response:

1. **Flow 1 response** chứa `api_url`
2. **Flow 2/3** extract `processingId` từ response
3. **Gọi API** với `processingId` đó

### Cách 3: Flow 2/3 Poll API

Nếu Flow 2/3 chạy độc lập:

1. **Cron/Schedule** trigger Flow 2/3
2. **Query PostgreSQL** để lấy danh sách `processing_id` đã hoàn thành
3. **Gọi API** cho mỗi `processing_id`

## 📝 Ví Dụ Cấu Hình Flow 2

### Node 1: HTTP Request - Get Data from API

```json
{
  "parameters": {
    "method": "GET",
    "url": "=https://api.aidocmanageagent.io.vn/api/document/get-from-postgres/{{ $json.processingId }}",
    "options": {
      "timeout": 30000
    }
  },
  "type": "n8n-nodes-base.httpRequest",
  "name": "Get Data from API"
}
```

### Node 2: Code - Extract Data

```javascript
// Extract dữ liệu từ API response
const apiResponse = $json || {};
const documentData = apiResponse.data || {};

return [{
  json: {
    processingId: documentData.processing_id,
    file_name: documentData.file_name,
    file_url: documentData.file_url,
    cloudinary_url: documentData.cloudinary_url,
    user_id: documentData.user_id,
    department: documentData.department,
    analysis_results: documentData.analysis_results,
    // ... các trường khác
  }
}];
```

## 📝 Ví Dụ Cấu Hình Flow 3

Tương tự Flow 2, thêm HTTP Request node để gọi API:

```json
{
  "parameters": {
    "method": "GET",
    "url": "=https://api.aidocmanageagent.io.vn/api/document/get-from-postgres/{{ $json.processingId }}",
    "options": {
      "timeout": 30000
    }
  },
  "type": "n8n-nodes-base.httpRequest",
  "name": "Get GDPR Data from API"
}
```

## 🔍 API Endpoint Details

### GET /api/document/get-from-postgres/:processingId

**Request:**
```bash
GET https://api.aidocmanageagent.io.vn/api/document/get-from-postgres/doc_1234567890_abc123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "processing_id": "doc_1234567890_abc123",
    "file_name": "document.pdf",
    "file_url": "https://...",
    "cloudinary_url": "https://...",
    "user_id": "user123",
    "department": "IT",
    "status": "completed",
    "analysis_results": {
      "main_theme": "...",
      "document_summary": [...],
      "key_takeaways": [...],
      "gaps_and_limitations": [...],
      "follow_up_questions": [...],
      "terminology_to_clarify": [...]
    },
    "docx_url": "https://...",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z",
    "analysis_completed_at": "2024-01-01T00:00:00.000Z"
  }
}
```

## 🧪 Testing

### Test API Endpoint

```bash
# Test API trực tiếp
curl -X GET \
  "https://api.aidocmanageagent.io.vn/api/document/get-from-postgres/doc_1234567890_abc123"
```

### Test Flow 2/3 với API

1. Upload file từ frontend
2. Chờ Flow 1 hoàn thành
3. Lấy `processingId` từ Flow 1 response
4. Test Flow 2/3 với `processingId` đó
5. Verify Flow 2/3 gọi API thành công

## ⚠️ Lưu Ý

1. **API phải accessible** từ N8N server
2. **Timeout**: API có timeout 30 giây
3. **Error handling**: Flow 2/3 cần xử lý lỗi khi API fail
4. **Retry logic**: Có thể thêm retry nếu API fail
5. **Caching**: Có thể cache response nếu cần

## 🔄 Migration từ Cách Cũ

Nếu đang dùng cách cũ (Flow 1 gửi trực tiếp):

1. **Xóa** các HTTP Request nodes gửi đến Flow 2/3 trong Flow 1
2. **Thêm** API URL vào Flow 1 response
3. **Cập nhật** Flow 2/3 để gọi API thay vì nhận trực tiếp
4. **Test** lại toàn bộ flow

## 📚 Tài Liệu Liên Quan

- [PostgreSQL API Integration](./POSTGRES_API_INTEGRATION.md)
- [Flow Integration (Cách cũ)](./FLOW_INTEGRATION.md)

