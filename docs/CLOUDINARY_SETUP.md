# Hướng dẫn Setup Cloudinary cho Workflow

## Tổng quan

Workflow hiện tại đã được cấu hình để:
1. Nhận file từ webhook
2. Download file từ URL
3. Upload file lên Cloudinary
4. Lấy file từ Cloudinary về
5. Phân tích file với AI
6. Lưu kết quả phân tích vào Postgres

## Bước 1: Tạo Cloudinary Account

1. Truy cập: https://cloudinary.com
2. Đăng ký tài khoản miễn phí
3. Lấy thông tin credentials từ Dashboard:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

## Bước 2: Cấu hình Cloudinary Credentials trong N8N

### 2.1. Tạo Cloudinary Credential

1. Mở N8N: https://n8n.aidocmanageagent.io.vn
2. Vào **Settings** → **Credentials**
3. Click **Add Credential** → Chọn **Cloudinary**
4. Điền thông tin:
   - **Cloud Name**: Từ Cloudinary dashboard
   - **API Key**: Từ Cloudinary dashboard
   - **API Secret**: Từ Cloudinary dashboard

### 2.2. Gán Credential cho Nodes

1. Mở workflow "Test 2"
2. Click vào node **"Upload File to Cloudinary"**
3. Chọn credential Cloudinary vừa tạo
4. Làm tương tự cho node **"Get File from Cloudinary"**

## Bước 3: Kiểm tra Workflow Flow

Workflow flow hiện tại:

```
Webhook (document-analyzer)
  ↓
Set File Data
  ↓
Download File From URL
  ↓
Upload File to Cloudinary
  ↓
Get File from Cloudinary
  ↓
Extract PDF Text
  ↓
[7 AI Analysis Agents]
  ↓
Merge → Aggregate
  ↓
Save Analysis to Postgres
  ↓
Google Docs → Google Drive
  ↓
Respond to Webhook
```

## Bước 4: Cấu hình Cloudinary Nodes

### 4.1. Upload File to Cloudinary Node

- **Operation**: Upload
- **Resource**: File
- **Public ID**: `={{ $('Set File Data').item.json.processingId }}/{{ $('Set File Data').item.json.name }}`
- **Binary Data**: true
- **Folder**: documents (optional)
- **Resource Type**: auto

### 4.2. Get File from Cloudinary Node

- **Operation**: Download
- **Resource**: File
- **Public ID**: `={{ $json.public_id }}`
- **Resource Type**: auto

## Bước 5: Test Workflow

### 5.1. Test với cURL

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

### 5.2. Kiểm tra Cloudinary

1. Vào Cloudinary Dashboard
2. Vào **Media Library**
3. Kiểm tra file đã được upload trong folder `documents`

## Lợi ích của Cloudinary

1. **CDN**: File được phân phối qua CDN toàn cầu
2. **Optimization**: Tự động optimize file (resize, compress, format conversion)
3. **Storage**: Lưu trữ file an toàn và scalable
4. **Transformations**: Có thể transform file (resize, crop, watermark, etc.)
5. **Analytics**: Theo dõi usage và bandwidth

## Troubleshooting

### Lỗi: "Invalid credentials"
- Kiểm tra lại Cloud Name, API Key, API Secret
- Đảm bảo credential được gán đúng cho cả 2 nodes

### Lỗi: "File too large"
- Cloudinary free plan giới hạn 10MB/file
- Nếu file lớn hơn, cần upgrade plan hoặc compress file trước

### Lỗi: "Public ID already exists"
- Public ID phải unique
- Đảm bảo processingId là unique
- Có thể thêm timestamp vào public_id

### File không hiển thị trong Cloudinary
- Kiểm tra folder path
- Kiểm tra resource_type (auto, image, video, raw)
- Kiểm tra upload có thành công không (xem execution logs trong N8N)

## Cập nhật Database Schema

Sau khi setup Cloudinary, cần cập nhật database để lưu Cloudinary URL:

```sql
-- Thêm cột cloudinary_url nếu chưa có
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS cloudinary_url TEXT;

-- Thêm cột analysis_results nếu chưa có
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS analysis_results JSONB;
```

## Best Practices

1. **Public ID**: Sử dụng processingId để đảm bảo unique
2. **Folder**: Tổ chức file theo folder (documents, images, etc.)
3. **Resource Type**: Dùng "auto" để Cloudinary tự detect
4. **Cleanup**: Xóa file cũ trong Cloudinary nếu không cần thiết
5. **Backup**: Backup file quan trọng ở nhiều nơi

