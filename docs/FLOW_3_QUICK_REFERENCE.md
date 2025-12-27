# 🚀 Flow 3: Quick Reference Guide

## 📋 Tóm Tắt Nhanh

Flow 3 là workflow tự động chia sẻ tài liệu sau khi đã kiểm tra GDPR. Workflow nhận dữ liệu từ frontend, xử lý, cấp quyền, gửi email và lưu vào database.

---

## 🔄 Luồng Đơn Giản

```
Frontend (SharingPage.jsx)
    ↓ POST /api/document/trigger-sharing
Backend (unified-document-agent.js)
    ↓ POST N8N Webhook
N8N Workflow (Flow 3.json)
    ├─ Parse & Validate
    ├─ Prepare Sharing
    ├─ Grant Permissions (Mock)
    ├─ Send Email
    └─ Save to PostgreSQL
```

---

## 📍 Các File Quan Trọng

| File | Vị trí | Mô tả |
|------|--------|-------|
| **Frontend** | `frontend/src/pages/SharingPage.jsx` | UI để chọn file và người nhận |
| **Backend API** | `api/unified-document-agent.js:1615-1850` | Endpoint `/api/document/trigger-sharing` |
| **N8N Workflow** | `workflows/Flow 3.json` | Workflow tự động hóa |
| **Database Schema** | `database/create_tables_inline.sql:40-73` | Bảng `document_sharing` |

---

## 🔗 API Endpoints

### 1. Trigger Sharing
```http
POST /api/document/trigger-sharing
Content-Type: application/json

{
  "processingId": "doc_123",
  "recipient_emails": ["user@example.com"],
  "recipient_names": ["User Name"],
  "department": "IT"
}
```

### 2. Check Status
```http
GET /api/document/status/:processingId
```

### 3. List Approvals
```http
GET /api/approvals/list?status=PENDING
```

---

## 🗄️ Database Table: document_sharing

### Các Trường Chính:
- `processing_id` - ID file đã xử lý
- `sharing_id` - ID duy nhất cho mỗi lần chia sẻ
- `recipient_emails[]` - Mảng email người nhận
- `recipient_names[]` - Mảng tên người nhận
- `gdpr_decision` - Quyết định GDPR (allow/anonymize/delete)
- `email_sent` - Đã gửi email chưa
- `flow3_completed` - Workflow hoàn thành chưa

---

## 🔧 N8N Workflow Nodes

| Node | Chức năng |
|------|-----------|
| 1️⃣ Webhook Trigger | Nhận request từ backend |
| 2️⃣ Xử lý dữ liệu | Parse và validate input |
| 7️⃣ Tạo link chia sẻ | Chuẩn bị email content |
| 🔐 Chuẩn bị quyền | Tạo permissions array |
| 🔐 Cấp quyền Google Drive | (Mock) Cấp quyền |
| 🛡️ Xử lý kết quả | Format kết quả |
| 8️⃣ Gửi email | Gửi email qua Gmail |
| 📊 Merge Email Data | Kết hợp dữ liệu |
| 9️⃣.5️⃣ Format Data | Format cho PostgreSQL |
| 9️⃣ Lưu Database | Insert/Update PostgreSQL |

---

## 📝 Dữ Liệu Đầu Vào

### Từ Frontend:
```javascript
{
  processingId: "doc_123",
  recipient_emails: ["user1@example.com", "user2@example.com"],
  recipient_names: ["User 1", "User 2"],
  department: "IT",
  gdpr_decision: "allow",
  legal_basis: "consent",
  retention_days: 30
}
```

### Từ Backend (sau khi query DB):
```javascript
{
  processing_id: "doc_123",
  file_name: "document.pdf",
  file_url: "https://...",
  cloudinary_url: "https://...",
  recipient_emails: ["user1@example.com"],
  recipient_names: ["User 1"],
  gdpr_decision: "allow",
  legal_basis: "consent",
  retention_days: 30
}
```

---

## ✅ Checklist Khi Debug

- [ ] Frontend gửi đúng `processingId` và `recipient_emails`
- [ ] Backend query được document từ PostgreSQL
- [ ] Backend query được GDPR data từ PostgreSQL
- [ ] N8N webhook nhận được request
- [ ] N8N workflow parse được dữ liệu
- [ ] Email được gửi thành công
- [ ] Dữ liệu được lưu vào `document_sharing`
- [ ] Frontend polling nhận được status update

---

## 🐛 Common Issues

### 1. **Missing processingId**
- **Nguyên nhân**: Frontend không gửi `processingId`
- **Giải pháp**: Kiểm tra `selectedFile.processing_id` trong SharingPage

### 2. **Empty recipient_emails**
- **Nguyên nhân**: Không có email hợp lệ
- **Giải pháp**: Validate email format trước khi gửi

### 3. **Document not found**
- **Nguyên nhân**: `processingId` không tồn tại trong database
- **Giải pháp**: Kiểm tra file đã được upload và phân tích chưa

### 4. **N8N webhook timeout**
- **Nguyên nhân**: N8N server không phản hồi
- **Giải pháp**: Kiểm tra N8N server và webhook URL

### 5. **Email not sent**
- **Nguyên nhân**: Gmail API error hoặc credentials sai
- **Giải pháp**: Kiểm tra Gmail credentials trong N8N

---

## 🔗 Links Hữu Ích

- **N8N Webhook**: `https://n8n.aidocmanageagent.io.vn/webhook/document-sharing`
- **Full Documentation**: [FLOW_3_DOCUMENTATION.md](./FLOW_3_DOCUMENTATION.md)
- **Database Schema**: [README_SCHEMA.md](./README_SCHEMA.md)

---

**Version**: 1.0  
**Last Updated**: 2024

