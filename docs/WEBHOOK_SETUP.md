# Hướng dẫn Setup Webhook trong N8N

## Vấn đề: Lỗi 404 Not Found khi gọi webhook

Lỗi 404 thường xảy ra khi:
1. Webhook chưa được **activate** trong N8N
2. Workflow chưa có **Respond to Webhook** node
3. Webhook path không đúng

## Các bước để fix:

### 1. Activate Workflow trong N8N

1. Đăng nhập vào N8N: `https://n8n.aidocmanageagent.io.vn`
2. Mở workflow "Dang Hong Nguyen - Analyze document" (Flow 1)
3. Click nút **"Active"** ở góc trên bên phải để activate workflow
4. Đảm bảo workflow có trạng thái **"Active"** (màu xanh)

### 2. Thêm Respond to Webhook Node

Workflow cần có node "Respond to Webhook" ở cuối để trả về response:

1. Trong N8N editor, tìm node cuối cùng của workflow (thường là "Google Drive1")
2. Thêm node mới: **"Respond to Webhook"**
3. Kết nối node cuối cùng với "Respond to Webhook"
4. Cấu hình "Respond to Webhook":
   - **Response Code**: 200
   - **Response Body**: JSON với kết quả analysis
   - Ví dụ:
     ```json
     {
       "success": true,
       "processingId": "={{ $json.processingId }}",
       "analysis": {
         "main_theme": "={{ $('main_theme').item.json.output.main_theme }}",
         "summary": "={{ $('document_summary').item.json.output }}"
       }
     }
     ```

### 3. Kiểm tra Webhook URL

Webhook URL phải đúng format:
- Base URL: `https://n8n.aidocmanageagent.io.vn`
- Path: `/webhook/document-analyzer`
- Full URL: `https://n8n.aidocmanageagent.io.vn/webhook/document-analyzer`

### 4. Test Webhook

Sau khi activate, test webhook bằng cách:

```bash
curl -X POST https://n8n.aidocmanageagent.io.vn/webhook/document-analyzer \
  -H "Content-Type: application/json" \
  -d '{
    "file": {
      "name": "test.pdf",
      "url": "https://api.aidocmanageagent.io.vn/uploads/test.pdf"
    },
    "userId": "test-user",
    "department": "IT",
    "processingId": "test-123"
  }'
```

Nếu thành công, bạn sẽ nhận được response 200 với data.

## Lưu ý quan trọng:

- **Webhook chỉ hoạt động khi workflow được activate**
- **Mỗi lần chỉnh sửa workflow, cần save và activate lại**
- **Webhook path phải khớp với path trong workflow**
- **Cần có "Respond to Webhook" node để trả về response**

## Troubleshooting:

### Lỗi 404:
- ✅ Kiểm tra workflow đã activate chưa
- ✅ Kiểm tra webhook path có đúng không
- ✅ Kiểm tra N8N server có accessible không

### Lỗi 500:
- ✅ Kiểm tra workflow có lỗi không
- ✅ Kiểm tra các node có credentials đúng không
- ✅ Xem execution logs trong N8N

### Timeout:
- ✅ Kiểm tra workflow có quá phức tạp không
- ✅ Tăng timeout trong backend code
- ✅ Kiểm tra network connection

