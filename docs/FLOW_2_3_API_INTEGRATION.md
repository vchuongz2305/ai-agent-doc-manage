# Flow 2 và Flow 3 - API Integration Guide

## 📋 Tổng Quan

Flow 2 (GDPR Compliance) và Flow 3 (Document Sharing) đã được cập nhật để **gọi API từ Flow 1** thay vì nhận dữ liệu trực tiếp.

## ✅ Đã Hoàn Thành

### Flow 2 (GDPR Compliance)

**Cấu trúc mới:**
```
1️⃣ Webhook - Nhận processingId
  ↓
2️⃣ Get Data from API (HTTP Request)
  ↓
3️⃣ Format Data for GDPR (Code)
  ↓
3️⃣ AI GDPR Decision (giữ nguyên)
  ↓
... (logic tiếp theo)
```

**Webhook URL:** `https://n8n.aidocmanageagent.io.vn/webhook/gdpr-compliance`

### Flow 3 (Document Sharing)

**Cấu trúc mới:**
```
1️⃣ Webhook - Nhận processingId
  ↓
2️⃣ Get Data from API (HTTP Request)
  ↓
3️⃣ Format Data for Sharing (Code)
  ↓
3️⃣ Lấy toàn bộ nhân sự (giữ nguyên)
  ↓
... (logic tiếp theo)
```

**Webhook URL:** `https://n8n.aidocmanageagent.io.vn/webhook/document-management`

## 🔧 Cấu Hình Chi Tiết

### Node 1: Webhook

**Flow 2 (GDPR):**
- Path: `gdpr-compliance`
- Method: `POST`
- Response Mode: `responseNode`

**Flow 3 (Sharing):**
- Path: `document-management`
- Method: `POST`
- Response Mode: `responseNode`

**Input từ Flow 1:**
```json
{
  "processingId": "doc_1766741636080_ubk9wvp5u",
  "api_url": "https://api.aidocmanageagent.io.vn/api/document/get-from-postgres/doc_1766741636080_ubk9wvp5u"
}
```

### Node 2: HTTP Request - Get Data from API

**Configuration:**
- Method: `GET`
- URL: `={{ $json.api_url || `https://api.aidocmanageagent.io.vn/api/document/get-from-postgres/${$json.processingId || $json.processing_id}` }}`
- Timeout: 30000ms
- Retry: Enabled (max 3 retries, delay 2000ms)

**Response từ API:**
```json
{
  "success": true,
  "data": {
    "processing_id": "doc_1766741636080_ubk9wvp5u",
    "file_name": "document.pdf",
    "file_url": "https://...",
    "cloudinary_url": "https://...",
    "user_id": "user123",
    "department": "IT",
    "status": "completed",
    "analysis_results": {...},
    "docx_url": "https://...",
    ...
  }
}
```

### Node 3: Code - Format Data

**Flow 2 (GDPR):**
- Extract `analysis_results` từ API response
- Format dữ liệu cho GDPR logic
- Bao gồm: `documentTitle`, `fileUrl`, `uploader`, `hasPersonalInfo`, etc.

**Flow 3 (Sharing):**
- Extract `analysis_results` từ API response
- Format dữ liệu cho Sharing logic
- Bao gồm: `documentTitle`, `documentCategory`, `sharingReason`, etc.

## 🚀 Cách Hoạt Động

### 1. Flow 1 Hoàn Thành

Flow 1 trả về response với `processingId` và `api_url`:
```json
{
  "success": true,
  "processingId": "doc_1766741636080_ubk9wvp5u",
  "api_url": "https://api.aidocmanageagent.io.vn/api/document/get-from-postgres/doc_1766741636080_ubk9wvp5u"
}
```

### 2. Trigger Flow 2/3

**Cách 1: Tự động từ Flow 1** (nếu cần)
- Flow 1 có thể gọi webhook Flow 2/3 sau khi hoàn thành
- Gửi POST request với `processingId` và `api_url`

**Cách 2: Manual trigger**
- Gửi POST request đến webhook Flow 2/3:
```bash
curl -X POST https://n8n.aidocmanageagent.io.vn/webhook/gdpr-compliance \
  -H "Content-Type: application/json" \
  -d '{
    "processingId": "doc_1766741636080_ubk9wvp5u",
    "api_url": "https://api.aidocmanageagent.io.vn/api/document/get-from-postgres/doc_1766741636080_ubk9wvp5u"
  }'
```

### 3. Flow 2/3 Xử Lý

1. **Webhook nhận** `processingId` và `api_url`
2. **HTTP Request gọi API** để lấy dữ liệu đầy đủ
3. **Code node format** dữ liệu cho logic tiếp theo
4. **Tiếp tục** với logic GDPR/Sharing như bình thường

## 📊 Dữ Liệu Được Format

### Flow 2 (GDPR) Nhận Được

```json
{
  "processingId": "doc_...",
  "file_name": "document.pdf",
  "file_url": "https://...",
  "documentTitle": "document.pdf",
  "documentCategory": "IT",
  "documentSummary": "Main theme from analysis...",
  "hasPersonalInfo": true,
  "uploader": "user123",
  "analysis_results": {
    "main_theme": "...",
    "key_takeaways": [...],
    ...
  },
  ...
}
```

### Flow 3 (Sharing) Nhận Được

```json
{
  "processingId": "doc_...",
  "documentTitle": "document.pdf",
  "documentCategory": "IT",
  "documentSummary": "Main theme from analysis...",
  "sharingReason": "Chia sẻ tài liệu document.pdf đã được phân tích",
  "file_url": "https://...",
  "analysis_results": {...},
  ...
}
```

## 🧪 Testing

### Test Flow 2 (GDPR)

```bash
# Gửi request đến webhook
curl -X POST https://n8n.aidocmanageagent.io.vn/webhook/gdpr-compliance \
  -H "Content-Type: application/json" \
  -d '{
    "processingId": "doc_1766741636080_ubk9wvp5u",
    "api_url": "https://api.aidocmanageagent.io.vn/api/document/get-from-postgres/doc_1766741636080_ubk9wvp5u"
  }'
```

### Test Flow 3 (Sharing)

```bash
# Gửi request đến webhook
curl -X POST https://n8n.aidocmanageagent.io.vn/webhook/document-management \
  -H "Content-Type: application/json" \
  -d '{
    "processingId": "doc_1766741636080_ubk9wvp5u",
    "api_url": "https://api.aidocmanageagent.io.vn/api/document/get-from-postgres/doc_1766741636080_ubk9wvp5u"
  }'
```

## ⚠️ Lưu Ý

1. **Webhook phải được activate** trong N8N
2. **API endpoint phải accessible** từ N8N server
3. **Retry logic** đã được bật (3 lần, delay 2s)
4. **Error handling** trong Code node sẽ throw error nếu API fail
5. **Timeout** 30 giây cho mỗi API call

## 🔍 Troubleshooting

### Lỗi: "Invalid API response: missing processing_id"

**Nguyên nhân:** API không trả về dữ liệu đúng format

**Giải pháp:**
- Kiểm tra API endpoint có hoạt động không
- Kiểm tra `processingId` có đúng không
- Kiểm tra PostgreSQL có dữ liệu không

### Lỗi: "Cannot connect to API"

**Nguyên nhân:** Network issue hoặc API server down

**Giải pháp:**
- Kiểm tra API server đang chạy
- Kiểm tra network connectivity từ N8N
- Kiểm tra firewall rules

### Webhook không nhận được request

**Nguyên nhân:** Webhook chưa được activate

**Giải pháp:**
- Activate workflow trong N8N
- Kiểm tra webhook path có đúng không
- Kiểm tra webhook URL trong N8N UI

## 📚 Tài Liệu Liên Quan

- [PostgreSQL API Integration](./POSTGRES_API_INTEGRATION.md)
- [Flow API Integration](./FLOW_API_INTEGRATION.md)

