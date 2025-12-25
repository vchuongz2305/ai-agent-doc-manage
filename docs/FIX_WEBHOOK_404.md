# Hướng dẫn Fix Lỗi 404 Webhook

## Vấn đề
Webhook trả về lỗi 404: `"The requested webhook \"POST document-analyzer\" is not registered."`

## Nguyên nhân
Trong N8N, webhook cần được **test hoặc save trong UI** để được register. Chỉ activate workflow qua API không đủ.

## Giải pháp

### Bước 1: Mở N8N Dashboard
1. Truy cập: https://n8n.aidocmanageagent.io.vn
2. Đăng nhập vào tài khoản

### Bước 2: Mở Workflow
1. Tìm workflow **"Test 2"** (ID: `9ucTmgO083P7qCGQ`)
2. Click để mở workflow editor

### Bước 3: Kiểm tra Webhook Node
1. Tìm node **"Webhook"** trong workflow
2. Click vào node để mở cấu hình
3. Kiểm tra:
   - **Path**: `document-analyzer` ✓
   - **Method**: `POST` ✓
   - **Response Mode**: `Using 'Respond to Webhook' Node` ✓

### Bước 4: Test Webhook (QUAN TRỌNG)
1. Trong Webhook node, click nút **"Test"** hoặc **"Listen for test event"**
2. N8N sẽ hiển thị URL test
3. Gửi một test request (có thể dùng Postman hoặc curl)
4. Điều này sẽ **register webhook** trong N8N

### Bước 5: Save Workflow
1. Click nút **"Save"** ở góc trên bên phải
2. Đảm bảo workflow có trạng thái **"Active"** (toggle màu xanh)

### Bước 6: Đợi và Test lại
1. Đợi 10-15 giây để webhook được register
2. Test lại bằng script:
   ```bash
   node api/test-webhook-direct.js
   ```

## Test Webhook bằng cURL

```bash
curl -X POST "https://n8n.aidocmanageagent.io.vn/webhook/document-analyzer" \
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

## Lưu ý quan trọng

1. **Webhook phải được test trong N8N UI** - Đây là bước bắt buộc
2. **Workflow phải được save** sau khi test
3. **Đợi 10-15 giây** sau khi save để webhook được register
4. **Webhook path phải đúng**: `document-analyzer`

## Kiểm tra Webhook đã hoạt động

Nếu webhook đã được register, bạn sẽ nhận được:
- Status 200 (nếu workflow chạy thành công)
- Status 500 (nếu có lỗi trong workflow, nhưng webhook đã hoạt động)

Nếu vẫn nhận 404, hãy:
1. Kiểm tra lại workflow có active không
2. Test webhook lại trong N8N UI
3. Save workflow lại
4. Đợi lâu hơn (30 giây)

## Troubleshooting

### Webhook vẫn 404 sau khi test
- Kiểm tra webhook path có đúng không
- Kiểm tra workflow có active không
- Thử deactivate và activate lại workflow
- Kiểm tra N8N logs để xem có lỗi gì không

### Webhook trả về 500
- Webhook đã hoạt động! ✅
- Vấn đề là trong workflow execution
- Kiểm tra N8N execution logs để xem lỗi cụ thể
- Có thể thiếu credentials hoặc data format không đúng

