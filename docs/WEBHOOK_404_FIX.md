# Fix Lỗi 404 Webhook "not registered"

## Vấn đề

Webhook trả về lỗi 404 với message:
```
"The requested webhook \"POST document-analyzer\" is not registered."
```

## Nguyên nhân

N8N cần thời gian để **register webhook** sau khi workflow được activate. Webhook không tự động available ngay lập tức.

## Giải pháp

### Cách 1: Đợi và Retry (Đã tự động)

Backend đã được cấu hình để:
1. Activate workflow
2. Đợi 5 giây để webhook được register
3. Retry request nếu gặp lỗi 404

### Cách 2: Activate và Test trong N8N (Recommended)

1. **Mở N8N Dashboard**: `https://n8n.aidocmanageagent.io.vn`
2. **Mở workflow "Dang Hong Nguyen - Analyze document"**
3. **Activate workflow** (toggle ở góc trên bên phải)
4. **Test webhook**:
   - Click vào node "Webhook"
   - Click "Test" hoặc "Listen for test event"
   - Gửi test request để đảm bảo webhook hoạt động
5. **Save workflow** sau khi test

### Cách 3: Kiểm tra Webhook URL

Webhook URL phải đúng format:
- Base: `https://n8n.aidocmanageagent.io.vn`
- Path: `/webhook/document-analyzer`
- Method: `POST`
- Full URL: `https://n8n.aidocmanageagent.io.vn/webhook/document-analyzer`

### Cách 4: Verify Webhook trong N8N

1. Trong N8N editor, click vào **Webhook node**
2. Kiểm tra:
   - **Path**: `document-analyzer` ✓
   - **Method**: `POST` ✓
   - **Production URL**: Hiển thị URL đầy đủ
3. Copy Production URL và so sánh với URL trong backend code

## Test Webhook

Sử dụng script test:

```bash
node api/test-webhook-direct.js
```

Hoặc test bằng curl:

```bash
curl -X POST "https://n8n.aidocmanageagent.io.vn/webhook/document-analyzer" \
  -H "Content-Type: application/json" \
  -d '{
    "file": {"name": "test.pdf", "url": "https://example.com/test.pdf"},
    "userId": "test",
    "department": "IT",
    "processingId": "test-123"
  }'
```

## Lưu ý quan trọng

1. **Webhook registration cần thời gian**: Sau khi activate workflow, đợi 5-10 giây trước khi test
2. **Workflow phải được save**: Sau khi chỉnh sửa, phải save workflow
3. **Webhook phải có "Respond to Webhook" node**: Để trả về response
4. **Production URL vs Test URL**: 
   - Production URL: Chỉ hoạt động khi workflow active
   - Test URL: Hoạt động ngay cả khi workflow inactive (chỉ để test)

## Troubleshooting

### Vẫn 404 sau khi activate?

1. **Kiểm tra workflow có active không**:
   ```bash
   curl http://localhost:5000/api/n8n/workflows/XoHMfHi0FLNWjqeF/status
   ```

2. **Kiểm tra webhook path có đúng không**:
   - Trong N8N: Webhook node → Path = `document-analyzer`
   - Trong code: `FLOW1_URL = .../webhook/document-analyzer`

3. **Thử activate lại workflow**:
   ```bash
   curl -X POST http://localhost:5000/api/n8n/workflows/XoHMfHi0FLNWjqeF/activate
   ```

4. **Kiểm tra N8N logs**: Xem có lỗi gì trong N8N execution logs không

### Webhook timeout?

- Tăng timeout trong backend code (hiện tại: 30 giây)
- Kiểm tra workflow có quá phức tạp không
- Kiểm tra network connection đến N8N server

## Best Practices

1. **Activate workflow một lần trong N8N** và giữ nó active
2. **Test webhook** sau khi activate để đảm bảo nó hoạt động
3. **Monitor N8N executions** để xem webhook có nhận được requests không
4. **Sử dụng production URL** (không phải test URL) trong production

