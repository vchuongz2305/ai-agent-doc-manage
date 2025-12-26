# Flow Integration - Tích Hợp Flow 1, Flow 2 và Flow 3

## 📋 Tổng Quan

Sau khi Flow 1 hoàn thành phân tích document và lưu vào PostgreSQL, hệ thống sẽ tự động gửi dữ liệu đến Flow 2 (Document Sharing) và Flow 3 (GDPR Compliance) thông qua webhook.

## 🔄 Luồng Hoạt Động

```
Flow 1: Document Analysis
├── Webhook nhận file
├── Extract PDF Text
├── AI Analysis (Gemini)
├── Parse Results
├── Save to PostgreSQL ✅
├── Get Data from PostgreSQL ✅
└── Gửi dữ liệu đến:
    ├── Respond to Webhook (trả về cho client)
    ├── Flow 2 Webhook (Document Sharing) ✅ NEW
    └── Flow 3 Webhook (GDPR Compliance) ✅ NEW
```

## ✅ Đã Hoàn Thành

### 1. Node "Get Data from Postgres"
- ✅ Lấy đầy đủ dữ liệu từ PostgreSQL (tất cả các trường)
- ✅ Format dữ liệu đầy đủ để gửi đến Flow 2 và Flow 3
- ✅ Bao gồm: processingId, file_name, file_url, cloudinary_url, user_id, department, status, analysis_results, docx_url, timestamps

### 2. Node "Send Data to Flow 2"
- ✅ HTTP Request node gửi POST đến webhook Flow 2
- ✅ URL: `https://n8n.aidocmanageagent.io.vn/webhook/document-management`
- ✅ Gửi đầy đủ dữ liệu từ PostgreSQL
- ✅ Chạy song song với các node khác (không block)

### 3. Node "Send Data to Flow 3"
- ✅ HTTP Request node gửi POST đến webhook Flow 3
- ✅ URL: `https://n8n.aidocmanageagent.io.vn/webhook/gdpr-compliance`
- ✅ Gửi đầy đủ dữ liệu từ PostgreSQL
- ✅ Chạy song song với các node khác (không block)

## 📊 Dữ Liệu Được Gửi

### Cấu Trúc Dữ Liệu

```json
{
  "processingId": "doc_1234567890_abc123",
  "processing_id": "doc_1234567890_abc123",
  "file_name": "document.pdf",
  "file_url": "https://cloudinary.com/...",
  "cloudinary_url": "https://cloudinary.com/...",
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
  "docx_url": "https://cloudinary.com/...",
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z",
  "analysis_completed_at": "2024-01-01T00:00:00.000Z"
}
```

### Flow 2 Nhận Được

Flow 2 (Document Sharing) sẽ nhận:
- `processingId`: ID để track document
- `file_name`: Tên file
- `file_url` / `cloudinary_url`: URL để download file
- `user_id`: User đã upload
- `department`: Phòng ban
- `analysis_results`: Kết quả phân tích từ AI
- `docx_url`: URL file DOCX (nếu có)

**Sử dụng để:**
- Quyết định chia sẻ document với ai
- Gửi email thông báo
- Cấp quyền truy cập

### Flow 3 Nhận Được

Flow 3 (GDPR Compliance) sẽ nhận:
- `processingId`: ID để track document
- `file_name`: Tên file
- `file_url` / `cloudinary_url`: URL để download file
- `user_id`: User đã upload
- `department`: Phòng ban
- `analysis_results`: Kết quả phân tích từ AI (để kiểm tra personal data)
- `docx_url`: URL file DOCX (nếu có)

**Sử dụng để:**
- Phân tích GDPR compliance
- Quyết định: delete/anonymize/allow
- Thông báo DPO nếu cần
- Ghi log audit trail

## 🔧 Cấu Hình

### Webhook URLs

Flow 2:
```
https://n8n.aidocmanageagent.io.vn/webhook/document-management
```

Flow 3:
```
https://n8n.aidocmanageagent.io.vn/webhook/gdpr-compliance
```

### Timeout

- Mỗi HTTP Request có timeout: **30 giây**
- Nếu timeout, workflow vẫn tiếp tục (không block)

## 🚀 Cách Hoạt Động

### 1. Flow 1 Hoàn Thành

Khi Flow 1 hoàn thành:
1. Lưu dữ liệu vào PostgreSQL
2. Node "Get Data from Postgres" lấy dữ liệu
3. Format dữ liệu đầy đủ
4. Gửi song song đến:
   - **Respond to Webhook** (trả về cho client)
   - **Send Data to Flow 2** (trigger Flow 2)
   - **Send Data to Flow 3** (trigger Flow 3)

### 2. Flow 2 Nhận Dữ Liệu

Flow 2 webhook nhận POST request với dữ liệu đầy đủ:
- Xử lý logic chia sẻ document
- Gửi email thông báo
- Cấp quyền truy cập

### 3. Flow 3 Nhận Dữ Liệu

Flow 3 webhook nhận POST request với dữ liệu đầy đủ:
- Phân tích GDPR compliance
- Quyết định hành động (delete/anonymize/allow)
- Thông báo DPO nếu cần

## 🧪 Testing

### Test Flow 1 → Flow 2

1. Upload file từ frontend
2. Chờ Flow 1 hoàn thành
3. Kiểm tra Flow 2 execution trong N8N
4. Verify Flow 2 nhận được dữ liệu đầy đủ

### Test Flow 1 → Flow 3

1. Upload file từ frontend
2. Chờ Flow 1 hoàn thành
3. Kiểm tra Flow 3 execution trong N8N
4. Verify Flow 3 nhận được dữ liệu đầy đủ

### Kiểm Tra Logs

Trong Flow 1, node "Get Data from Postgres" sẽ log:
```
📊 Data from Postgres:
   Processing ID: doc_1234567890_abc123
   File URL (PDF): https://...
   Analysis Results: {...}

📤 Full data prepared for Flow 2 & Flow 3: {...}
```

## ⚠️ Lưu Ý

1. **Flow 2 và Flow 3 phải được activate** trong N8N để nhận webhook
2. **Webhook URLs phải đúng** - kiểm tra trong N8N UI
3. **Timeout 30 giây** - nếu Flow 2/3 xử lý lâu, có thể timeout
4. **Chạy song song** - Flow 2 và Flow 3 chạy độc lập, không block nhau
5. **Error handling** - Nếu Flow 2/3 fail, Flow 1 vẫn hoàn thành thành công

## 🔍 Troubleshooting

### Flow 2/3 không nhận được dữ liệu

**Kiểm tra:**
1. Flow 2/3 đã được activate chưa?
2. Webhook URLs có đúng không?
3. Kiểm tra execution logs trong N8N
4. Kiểm tra network connectivity

### Dữ liệu không đầy đủ

**Kiểm tra:**
1. Node "Get Data from Postgres" có trả về đầy đủ không?
2. PostgreSQL có đầy đủ dữ liệu không?
3. Kiểm tra logs trong Flow 1

### Timeout errors

**Giải pháp:**
1. Tăng timeout trong HTTP Request nodes
2. Kiểm tra Flow 2/3 có xử lý quá lâu không
3. Optimize Flow 2/3 để xử lý nhanh hơn

## 📚 Tài Liệu Liên Quan

- [PostgreSQL API Integration](./POSTGRES_API_INTEGRATION.md)
- [Workflow Overview](./WORKFLOW_OVERVIEW.md)
- [Three Flows Comprehensive Guide](./THREE_FLOWS_COMPREHENSIVE_GUIDE.md)

