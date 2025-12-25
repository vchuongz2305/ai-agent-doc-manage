# Hướng dẫn Setup Postgres cho Workflow

## Tổng quan

Workflow hiện tại đã được cấu hình để:
1. Nhận file từ webhook
2. Lưu metadata file vào Postgres
3. Lấy file từ Postgres
4. Download file và gửi qua AI phân tích

## Bước 1: Tạo Database và Table

### 1.1. Kết nối Postgres

```bash
psql -U your_username -d your_database
```

### 1.2. Chạy SQL Script

```bash
psql -U your_username -d your_database -f database/create_documents_table.sql
```

Hoặc copy và chạy trực tiếp trong psql:

```sql
-- Tạo bảng documents
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    processing_id VARCHAR(255) UNIQUE NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_url TEXT NOT NULL,
    user_id VARCHAR(255),
    department VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    analysis_completed_at TIMESTAMP
);

-- Tạo indexes
CREATE INDEX IF NOT EXISTS idx_documents_processing_id ON documents(processing_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
```

## Bước 2: Cấu hình Postgres Credentials trong N8N

### 2.1. Tạo Postgres Credential

1. Mở N8N: https://n8n.aidocmanageagent.io.vn
2. Vào **Settings** → **Credentials**
3. Click **Add Credential** → Chọn **Postgres**
4. Điền thông tin:
   - **Host**: localhost hoặc IP của Postgres server
   - **Database**: Tên database
   - **User**: Username
   - **Password**: Password
   - **Port**: 5432 (mặc định)
   - **SSL**: Tùy chọn (Enable nếu cần)

### 2.2. Gán Credential cho Nodes

1. Mở workflow "Test 2"
2. Click vào node **"Save File to Postgres"**
3. Chọn credential Postgres vừa tạo
4. Làm tương tự cho node **"Get File from Postgres"**

## Bước 3: Kiểm tra Workflow Flow

Workflow flow hiện tại:

```
Webhook (document-analyzer)
  ↓
Set File Data
  ↓
Save File to Postgres (INSERT)
  ↓
Get File from Postgres (SELECT)
  ↓
Download File From URL
  ↓
Extract PDF Text
  ↓
[7 AI Analysis Agents]
  ↓
Merge → Aggregate
  ↓
Google Docs → Google Drive
  ↓
Respond to Webhook
```

## Bước 4: Test Workflow

### 4.1. Test với cURL

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

### 4.2. Kiểm tra Database

```sql
-- Xem tất cả documents
SELECT * FROM documents ORDER BY created_at DESC;

-- Xem document cụ thể
SELECT * FROM documents WHERE processing_id = 'test-123';

-- Xem documents theo status
SELECT * FROM documents WHERE status = 'pending';
```

## Cấu trúc Bảng Documents

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| processing_id | VARCHAR(255) | Unique processing ID |
| file_name | VARCHAR(500) | Tên file |
| file_url | TEXT | URL của file |
| user_id | VARCHAR(255) | ID người dùng |
| department | VARCHAR(100) | Phòng ban |
| status | VARCHAR(50) | Trạng thái (pending, processing, completed, failed) |
| created_at | TIMESTAMP | Thời gian tạo |
| updated_at | TIMESTAMP | Thời gian cập nhật |
| analysis_completed_at | TIMESTAMP | Thời gian hoàn thành phân tích |

## Troubleshooting

### Lỗi: "relation 'documents' does not exist"
- Chạy lại SQL script để tạo bảng
- Kiểm tra database name có đúng không

### Lỗi: "permission denied"
- Kiểm tra user có quyền CREATE TABLE không
- Kiểm tra user có quyền INSERT/SELECT không

### Lỗi: "connection refused"
- Kiểm tra Postgres server có đang chạy không
- Kiểm tra host và port có đúng không
- Kiểm tra firewall có chặn port 5432 không

### Lỗi trong N8N: "Invalid credentials"
- Kiểm tra lại credential trong N8N
- Test connection trong N8N credential settings
- Đảm bảo Postgres server cho phép remote connection (nếu cần)

## Cập nhật Status

Có thể thêm node để cập nhật status sau khi phân tích xong:

```sql
UPDATE documents 
SET status = 'completed', analysis_completed_at = NOW() 
WHERE processing_id = '{{ $json.processingId }}';
```

