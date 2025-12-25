# Debug Lỗi 500 trong N8N Workflow

## Tình trạng hiện tại

✅ **Webhook đã được register** - Không còn lỗi 404  
❌ **Workflow trả về lỗi 500** - Có lỗi trong quá trình xử lý

## Cách Debug

### 1. Kiểm tra Execution Logs trong N8N

1. Mở N8N: `https://n8n.aidocmanageagent.io.vn`
2. Mở workflow **"Test 2"** (ID: `9ucTmgO083P7qCGQ`)
3. Click tab **"Executions"** (ở trên cùng)
4. Tìm execution mới nhất (có timestamp gần nhất)
5. Click vào execution để xem chi tiết
6. Xem node nào bị lỗi (sẽ có dấu ❌ đỏ)

### 2. Kiểm tra từng Node

Trong execution detail, kiểm tra:
- **Webhook node**: Có nhận được data không?
- **Set File Data node**: Data có đúng format không?
- **Download File node**: Có thể download file không?
- **Extract PDF Text node**: Có lỗi gì không?

### 3. Các lỗi thường gặp

#### Lỗi: Missing credentials
- **Triệu chứng**: Node báo "Missing credentials"
- **Fix**: Click vào node → Setup credentials → Chọn hoặc tạo credentials

#### Lỗi: Invalid data format
- **Triệu chứng**: Node không nhận được data đúng format
- **Fix**: Kiểm tra data từ node trước, đảm bảo format đúng

#### Lỗi: File download failed
- **Triệu chứng**: Không thể download file từ URL
- **Fix**: 
  - Kiểm tra file URL có accessible không
  - Kiểm tra file có tồn tại không
  - Kiểm tra permissions

#### Lỗi: Node execution timeout
- **Triệu chứng**: Node chạy quá lâu
- **Fix**: Tăng timeout hoặc tối ưu workflow

### 4. Test từng Node

1. Trong N8N editor, click vào node có lỗi
2. Click **"Execute Node"** để test node đó
3. Xem output và error messages
4. Fix lỗi và test lại

### 5. Kiểm tra Data Flow

Đảm bảo data được truyền đúng giữa các nodes:
- Webhook → Set File Data → Download File → Extract PDF Text

### 6. Common Issues với Workflow "Test 2"

Nếu workflow "Test 2" khác với Flow 1.json gốc:

1. **Kiểm tra webhook path**: Phải là `document-analyzer`
2. **Kiểm tra data structure**: Webhook nhận data như thế nào?
3. **Kiểm tra file download**: URL có đúng format không?
4. **Kiểm tra credentials**: Tất cả nodes cần credentials đã được setup chưa?

## Quick Fix Checklist

- [ ] Workflow "Test 2" đang ACTIVE
- [ ] Webhook path là `document-analyzer`
- [ ] Tất cả nodes có credentials (nếu cần)
- [ ] File URL có thể access được
- [ ] Data format đúng với workflow expectations
- [ ] Không có node nào bị disable
- [ ] Workflow đã được save

## Test với Data thực tế

Sau khi fix, test với data thực tế:

```bash
curl -X POST "https://n8n.aidocmanageagent.io.vn/webhook/document-analyzer" \
  -H "Content-Type: application/json" \
  -d '{
    "file": {
      "name": "test.pdf",
      "size": 1000,
      "mimeType": "application/pdf",
      "path": "/test/path",
      "url": "https://api.aidocmanageagent.io.vn/uploads/test.pdf"
    },
    "userId": "test-user",
    "department": "IT",
    "processingId": "test-123"
  }'
```

## Next Steps

1. **Kiểm tra execution logs** trong N8N để xem lỗi cụ thể
2. **Fix lỗi** trong workflow
3. **Test lại** với script: `npm run test:webhook-status`
4. **Upload file từ frontend** để test end-to-end

