# PostgreSQL API Integration - Hướng Dẫn Sử Dụng

## 📋 Tổng Quan

Sau khi workflow hoàn thành, hệ thống sẽ tự động lấy dữ liệu từ PostgreSQL và tích hợp thành API để gửi đi.

## ✅ Đã Hoàn Thành

### 1. PostgreSQL Client Library
- ✅ Đã thêm `pg` library vào `package.json`
- ✅ Cài đặt: `npm install`

### 2. PostgreSQL Connection Pool
- ✅ Tự động kết nối khi server khởi động
- ✅ Connection pool với tối đa 20 connections
- ✅ Tự động test connection khi khởi động

### 3. API Endpoints Mới

#### **GET /api/document/get-from-postgres/:processingId**
Lấy dữ liệu từ PostgreSQL theo `processing_id`

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

#### **GET /api/document/get-all-completed**
Lấy tất cả documents đã hoàn thành từ PostgreSQL

**Query Parameters:**
- `limit` (optional, default: 50): Số lượng records tối đa
- `offset` (optional, default: 0): Số lượng records bỏ qua
- `userId` (optional): Lọc theo user_id
- `department` (optional): Lọc theo department
- `status` (optional, default: 'completed'): Lọc theo status

**Request:**
```bash
GET https://api.aidocmanageagent.io.vn/api/document/get-all-completed?limit=10&offset=0&userId=user123
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "processing_id": "doc_1234567890_abc123",
      "file_name": "document.pdf",
      ...
    },
    ...
  ],
  "pagination": {
    "total": 100,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

#### **POST /api/document/send-completed-data**
Lấy dữ liệu từ PostgreSQL và gửi đến API endpoint khác

**Request Body:**
```json
{
  "processingId": "doc_1234567890_abc123",
  "targetUrl": "https://external-api.com/webhook",
  "targetMethod": "POST",
  "headers": {
    "Authorization": "Bearer token123",
    "X-Custom-Header": "value"
  },
  "includeAllFields": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Data fetched and sent successfully",
  "document": {
    "processing_id": "doc_1234567890_abc123",
    ...
  },
  "targetResponse": {
    "status": 200,
    "data": {...}
  }
}
```

### 4. Workflow Integration
- ✅ Đã thêm HTTP Request node "Send Data via API" vào workflow
- ✅ Node này sẽ tự động gọi API sau khi lấy dữ liệu từ PostgreSQL
- ✅ Chạy song song với "Respond to Webhook" node

## 🔧 Cấu Hình

### Environment Variables

Thêm vào file `.env`:

```env
# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=document_management
POSTGRES_USER=doc_user
POSTGRES_PASSWORD=your_password_here
```

### Cài Đặt Dependencies

```bash
npm install
```

## 🚀 Cách Sử Dụng

### 1. Tự Động (Workflow Integration)

Workflow sẽ tự động gọi API sau khi hoàn thành:
- Workflow lưu dữ liệu vào PostgreSQL
- Node "Get Data from Postgres" lấy dữ liệu
- Node "Send Data via API" gọi API endpoint
- Node "Respond to Webhook" trả về kết quả

### 2. Thủ Công (API Calls)

#### Lấy dữ liệu theo processing_id:
```bash
curl -X GET \
  "https://api.aidocmanageagent.io.vn/api/document/get-from-postgres/doc_1234567890_abc123"
```

#### Lấy tất cả documents đã hoàn thành:
```bash
curl -X GET \
  "https://api.aidocmanageagent.io.vn/api/document/get-all-completed?limit=10&offset=0"
```

#### Gửi dữ liệu đến API khác:
```bash
curl -X POST \
  "https://api.aidocmanageagent.io.vn/api/document/send-completed-data" \
  -H "Content-Type: application/json" \
  -d '{
    "processingId": "doc_1234567890_abc123",
    "targetUrl": "https://external-api.com/webhook",
    "targetMethod": "POST",
    "headers": {
      "Authorization": "Bearer token123"
    }
  }'
```

## 📊 Workflow Flow

```
Webhook
→ Set File Data
→ Download File From URL
→ Extract PDF Text
→ comprehensive_analysis
→ Parse Combined Result
→ Merge
→ Aggregate
→ Format Data for Postgres
→ Save Analysis to Postgres
→ Get Data from Postgres
  ├─→ Respond to Webhook
  └─→ Send Data via API ✅ NEW
```

## 🧪 Testing

### Test PostgreSQL Connection:
```bash
# Kiểm tra connection trong logs khi start server
npm start
# Tìm dòng: "✅ PostgreSQL connection test successful"
```

### Test API Endpoints:
```bash
# Test get document by processing_id
curl http://localhost:5000/api/document/get-from-postgres/test_processing_id

# Test get all completed
curl http://localhost:5000/api/document/get-all-completed

# Test send data
curl -X POST http://localhost:5000/api/document/send-completed-data \
  -H "Content-Type: application/json" \
  -d '{
    "processingId": "test_processing_id",
    "targetUrl": "https://httpbin.org/post",
    "targetMethod": "POST"
  }'
```

## 🔍 Troubleshooting

### Lỗi: "PostgreSQL connection test failed"
- Kiểm tra PostgreSQL service đang chạy: `sudo systemctl status postgresql`
- Kiểm tra credentials trong `.env` file
- Kiểm tra database và user đã được tạo

### Lỗi: "Document not found"
- Kiểm tra `processing_id` có đúng không
- Kiểm tra document đã được lưu vào PostgreSQL chưa
- Query trực tiếp: `SELECT * FROM documents WHERE processing_id = 'your_id';`

### Lỗi: "Failed to send data to target API"
- Kiểm tra `targetUrl` có đúng không
- Kiểm tra network connectivity
- Kiểm tra headers (Authorization, etc.)

## 📝 Notes

- API endpoints sử dụng connection pool để tối ưu performance
- Tất cả timestamps được trả về dưới dạng ISO 8601 format
- `analysis_results` là JSONB field, có thể query và filter
- Workflow node "Send Data via API" chạy song song với "Respond to Webhook", không block response

## 🎯 Use Cases

1. **Webhook Integration**: Gửi dữ liệu đến external webhook sau khi workflow hoàn thành
2. **Data Synchronization**: Đồng bộ dữ liệu với hệ thống khác
3. **Notification System**: Gửi thông báo với dữ liệu đầy đủ
4. **Analytics**: Thu thập dữ liệu cho analytics platform
5. **Backup**: Backup dữ liệu sang hệ thống khác

