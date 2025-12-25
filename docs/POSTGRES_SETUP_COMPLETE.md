# Hướng Dẫn Setup PostgreSQL Đầy Đủ

## 📋 Mục Lục

1. [Cài Đặt PostgreSQL](#1-cài-đặt-postgresql)
2. [Tạo Database và User](#2-tạo-database-và-user)
3. [Tạo Bảng và Schema](#3-tạo-bảng-và-schema)
4. [Cấu Hình N8N](#4-cấu-hình-n8n)
5. [Test Kết Nối](#5-test-kết-nối)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Cài Đặt PostgreSQL

### 1.1. Trên Ubuntu/Debian

```bash
# Cập nhật package list
sudo apt update

# Cài đặt PostgreSQL
sudo apt install postgresql postgresql-contrib

# Kiểm tra version
psql --version

# Khởi động PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql  # Tự động khởi động khi boot
```

### 1.2. Trên CentOS/RHEL

```bash
# Cài đặt PostgreSQL
sudo yum install postgresql-server postgresql-contrib

# Khởi tạo database cluster
sudo postgresql-setup initdb

# Khởi động service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 1.3. Trên macOS (Homebrew)

```bash
# Cài đặt PostgreSQL
brew install postgresql@14

# Khởi động service
brew services start postgresql@14
```

### 1.4. Trên Windows

1. Download PostgreSQL từ: https://www.postgresql.org/download/windows/
2. Chạy installer và làm theo hướng dẫn
3. Ghi nhớ password cho user `postgres`

---

## 2. Tạo Database và User

### 2.1. Kết Nối Vào PostgreSQL

```bash
# Chuyển sang user postgres
sudo -u postgres psql

# Hoặc nếu đã có user postgres với password
psql -U postgres -h localhost
```

### 2.2. Tạo Database

```sql
-- Tạo database mới
CREATE DATABASE document_management;

-- Hoặc với encoding cụ thể
CREATE DATABASE document_management 
    WITH ENCODING 'UTF8' 
    LC_COLLATE='en_US.UTF-8' 
    LC_CTYPE='en_US.UTF-8' 
    TEMPLATE=template0;
```

### 2.3. Tạo User và Cấp Quyền

```sql
-- Tạo user mới
CREATE USER doc_user WITH PASSWORD 'your_secure_password_here';

-- Cấp quyền cho user
GRANT ALL PRIVILEGES ON DATABASE document_management TO doc_user;

-- Kết nối vào database
\c document_management

-- Cấp quyền trên schema public
GRANT ALL ON SCHEMA public TO doc_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO doc_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO doc_user;

-- Cấp quyền cho các bảng tương lai
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO doc_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO doc_user;
```

### 2.4. Kiểm Tra

```sql
-- Liệt kê databases
\l

-- Liệt kê users
\du

-- Kết nối vào database với user mới
\c document_management doc_user
```

---

## 3. Tạo Bảng và Schema

### 3.1. Chạy SQL Scripts

#### Cách 1: Chạy từ file

```bash
# Kết nối và chạy script
psql -U doc_user -d document_management -f database/create_documents_table.sql

# Thêm cột docx_url (nếu cần)
psql -U doc_user -d document_management -f database/add_docx_url_column.sql
```

#### Cách 2: Chạy trực tiếp trong psql

```bash
# Kết nối vào database
psql -U doc_user -d document_management
```

Sau đó copy và paste nội dung từ file SQL:

```sql
-- File: database/create_documents_table.sql
-- Tạo bảng documents để lưu thông tin file
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    processing_id VARCHAR(255) UNIQUE NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_url TEXT NOT NULL,
    cloudinary_url TEXT,
    user_id VARCHAR(255),
    department VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    analysis_results JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    analysis_completed_at TIMESTAMP,
    CONSTRAINT documents_processing_id_key UNIQUE (processing_id)
);

-- Tạo index để tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_documents_processing_id ON documents(processing_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

-- Tạo trigger để tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Thêm cột docx_url (nếu chưa có)
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS docx_url TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_docx_url ON documents(docx_url) WHERE docx_url IS NOT NULL;
```

### 3.2. Kiểm Tra Bảng Đã Tạo

```sql
-- Xem danh sách bảng
\dt

-- Xem cấu trúc bảng documents
\d documents

-- Xem dữ liệu mẫu (nếu có)
SELECT * FROM documents LIMIT 5;
```

### 3.3. Cấu Trúc Bảng Documents

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key, tự động tăng |
| `processing_id` | VARCHAR(255) | Unique processing ID (không trùng lặp) |
| `file_name` | VARCHAR(500) | Tên file gốc |
| `file_url` | TEXT | URL của file gốc |
| `cloudinary_url` | TEXT | URL của file trên Cloudinary |
| `user_id` | VARCHAR(255) | ID người dùng |
| `department` | VARCHAR(100) | Phòng ban |
| `status` | VARCHAR(50) | Trạng thái: `pending`, `processing`, `completed`, `failed` |
| `analysis_results` | JSONB | Kết quả phân tích từ AI (JSON) |
| `docx_url` | TEXT | URL của file DOCX phân tích trên Cloudinary |
| `created_at` | TIMESTAMP | Thời gian tạo record |
| `updated_at` | TIMESTAMP | Thời gian cập nhật cuối (tự động) |
| `analysis_completed_at` | TIMESTAMP | Thời gian hoàn thành phân tích |

---

## 4. Cấu Hình N8N

### 4.1. Tạo Postgres Credential trong N8N

1. **Mở N8N Dashboard**
   - URL: `https://n8n.aidocmanageagent.io.vn` (hoặc URL của bạn)

2. **Vào Settings → Credentials**
   - Click vào menu **Settings** (biểu tượng bánh răng)
   - Chọn **Credentials**

3. **Tạo Credential Mới**
   - Click **Add Credential**
   - Tìm và chọn **Postgres**
   - Điền thông tin:

   ```
   Name: PostgreSQL - Document Management
   Host: localhost (hoặc IP server PostgreSQL)
   Database: document_management
   User: doc_user
   Password: your_secure_password_here
   Port: 5432
   SSL: Disable (hoặc Enable nếu cần)
   ```

4. **Test Connection**
   - Click **Test** để kiểm tra kết nối
   - Nếu thành công, click **Save**

### 4.2. Gán Credential cho Node

1. **Mở Workflow**
   - Vào **Workflows**
   - Mở workflow **"Test 2"** (hoặc workflow của bạn)

2. **Cấu Hình Node "Save Analysis to Postgres"**
   - Click vào node **"Save Analysis to Postgres"**
   - Trong phần **Credential**, chọn credential vừa tạo
   - Kiểm tra query SQL:

   ```sql
   INSERT INTO documents (
     processing_id, 
     file_name, 
     file_url, 
     user_id, 
     department, 
     status, 
     analysis_results, 
     cloudinary_url, 
     docx_url,
     created_at, 
     updated_at, 
     analysis_completed_at
   ) VALUES (
     '{{ $('Set File Data').item.json.processingId }}',
     '{{ $('Set File Data').item.json.name }}',
     '{{ $('Set File Data').item.json.file_url }}',
     '{{ $('Set File Data').item.json.userId }}',
     '{{ $('Set File Data').item.json.department }}',
     'completed',
     '{{ JSON.stringify($json).replace(/'/g, "''") }}'::jsonb,
     '{{ $('Set File Data').item.json.cloudinary_url || $('Set File Data').item.json.file_url }}',
     '{{ $json.docx_url || '' }}',
     NOW(),
     NOW(),
     NOW()
   ) ON CONFLICT (processing_id) DO UPDATE SET 
     status = 'completed',
     analysis_results = EXCLUDED.analysis_results,
     cloudinary_url = EXCLUDED.cloudinary_url,
     docx_url = COALESCE(NULLIF(EXCLUDED.docx_url, ''), documents.docx_url),
     updated_at = NOW(),
     analysis_completed_at = NOW()
   RETURNING *;
   ```

3. **Save Workflow**
   - Click **Save** để lưu workflow

---

## 5. Test Kết Nối

### 5.1. Test Từ Command Line

```bash
# Test kết nối
psql -U doc_user -d document_management -h localhost -c "SELECT version();"

# Test insert dữ liệu mẫu
psql -U doc_user -d document_management -h localhost << EOF
INSERT INTO documents (
    processing_id, 
    file_name, 
    file_url, 
    user_id, 
    department, 
    status
) VALUES (
    'test-001',
    'test.pdf',
    'https://example.com/test.pdf',
    'test-user',
    'IT',
    'pending'
) ON CONFLICT (processing_id) DO NOTHING;
SELECT * FROM documents WHERE processing_id = 'test-001';
EOF
```

### 5.2. Test Từ N8N

1. **Test Credential**
   - Vào **Settings → Credentials**
   - Click vào credential PostgreSQL
   - Click **Test** để kiểm tra

2. **Test Node trong Workflow**
   - Mở workflow
   - Click vào node **"Save Analysis to Postgres"**
   - Click **Execute Node** để test
   - Kiểm tra output

3. **Test Workflow Hoàn Chỉnh**

   ```bash
   curl -X POST "https://n8n.aidocmanageagent.io.vn/webhook/document-analyzer" \
     -H "Content-Type: application/json" \
     -d '{
       "file": {
         "name": "test.pdf",
         "url": "https://api.aidocmanageagent.io.vn/uploads/test.pdf",
         "cloudinary_url": "https://res.cloudinary.com/your-cloud/raw/upload/test.pdf"
       },
       "userId": "test-user",
       "department": "IT",
       "processingId": "test-123"
     }'
   ```

### 5.3. Kiểm Tra Dữ Liệu

```sql
-- Xem tất cả documents
SELECT * FROM documents ORDER BY created_at DESC LIMIT 10;

-- Xem document cụ thể
SELECT * FROM documents WHERE processing_id = 'test-123';

-- Xem documents theo status
SELECT 
    status, 
    COUNT(*) as count 
FROM documents 
GROUP BY status;

-- Xem documents có docx_url
SELECT 
    processing_id,
    file_name,
    docx_url,
    status,
    created_at
FROM documents 
WHERE docx_url IS NOT NULL
ORDER BY created_at DESC;
```

---

## 6. Troubleshooting

### 6.1. Lỗi Kết Nối

#### "connection refused"

**Nguyên nhân:**
- PostgreSQL service không chạy
- Firewall chặn port 5432
- Host/Port sai

**Giải pháp:**
```bash
# Kiểm tra service
sudo systemctl status postgresql

# Khởi động service
sudo systemctl start postgresql

# Kiểm tra port
sudo netstat -tlnp | grep 5432

# Kiểm tra firewall
sudo ufw status
sudo ufw allow 5432/tcp
```

#### "authentication failed"

**Nguyên nhân:**
- Username/Password sai
- User không có quyền truy cập

**Giải pháp:**
```sql
-- Đổi password
ALTER USER doc_user WITH PASSWORD 'new_password';

-- Kiểm tra quyền
\du doc_user
```

### 6.2. Lỗi Database

#### "relation 'documents' does not exist"

**Nguyên nhân:**
- Bảng chưa được tạo
- Kết nối sai database

**Giải pháp:**
```sql
-- Kiểm tra database hiện tại
SELECT current_database();

-- Kiểm tra bảng
\dt

-- Tạo lại bảng
\i database/create_documents_table.sql
```

#### "permission denied"

**Nguyên nhân:**
- User không có quyền CREATE/INSERT/SELECT

**Giải pháp:**
```sql
-- Cấp quyền lại
GRANT ALL PRIVILEGES ON DATABASE document_management TO doc_user;
\c document_management
GRANT ALL ON SCHEMA public TO doc_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO doc_user;
```

### 6.3. Lỗi N8N

#### "Invalid credentials"

**Giải pháp:**
1. Kiểm tra lại thông tin trong N8N credential
2. Test connection trong N8N
3. Kiểm tra PostgreSQL cho phép remote connection:

   ```bash
   # File: /etc/postgresql/14/main/postgresql.conf
   listen_addresses = '*'  # hoặc 'localhost' nếu chỉ local
   
   # File: /etc/postgresql/14/main/pg_hba.conf
   # Thêm dòng:
   host    document_management    doc_user    0.0.0.0/0    md5
   
   # Restart PostgreSQL
   sudo systemctl restart postgresql
   ```

#### "Query execution failed"

**Giải pháp:**
1. Kiểm tra SQL query trong node
2. Test query trực tiếp trong psql
3. Kiểm tra log N8N để xem lỗi chi tiết

### 6.4. Lỗi JSONB

#### "invalid input syntax for type jsonb"

**Nguyên nhân:**
- JSON string không hợp lệ

**Giải pháp:**
```sql
-- Kiểm tra JSON hợp lệ
SELECT '{"test": "value"}'::jsonb;

-- Sửa query trong N8N, đảm bảo escape đúng
-- Sử dụng: JSON.stringify($json).replace(/'/g, "''")
```

---

## 7. Backup và Restore

### 7.1. Backup Database

```bash
# Backup toàn bộ database
pg_dump -U doc_user -d document_management -F c -f backup_$(date +%Y%m%d).dump

# Backup chỉ schema
pg_dump -U doc_user -d document_management --schema-only -f schema_backup.sql

# Backup chỉ data
pg_dump -U doc_user -d document_management --data-only -f data_backup.sql
```

### 7.2. Restore Database

```bash
# Restore từ file dump
pg_restore -U doc_user -d document_management backup_20240101.dump

# Restore từ SQL file
psql -U doc_user -d document_management -f backup.sql
```

---

## 8. Monitoring và Maintenance

### 8.1. Kiểm Tra Kích Thước Database

```sql
-- Kích thước database
SELECT pg_size_pretty(pg_database_size('document_management'));

-- Kích thước bảng
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 8.2. Cleanup Dữ Liệu Cũ

```sql
-- Xóa documents cũ hơn 90 ngày
DELETE FROM documents 
WHERE created_at < NOW() - INTERVAL '90 days'
AND status = 'completed';

-- Vacuum để giải phóng không gian
VACUUM FULL documents;
```

### 8.3. Tối Ưu Performance

```sql
-- Analyze tables để cập nhật statistics
ANALYZE documents;

-- Reindex nếu cần
REINDEX TABLE documents;
```

---

## 9. Security Best Practices

1. **Sử dụng password mạnh** cho database user
2. **Giới hạn quyền truy cập** - chỉ cấp quyền cần thiết
3. **Sử dụng SSL** cho kết nối remote
4. **Backup định kỳ** database
5. **Giám sát logs** để phát hiện truy cập bất thường
6. **Cập nhật PostgreSQL** thường xuyên

---

## 10. Tài Liệu Tham Khảo

- PostgreSQL Official Docs: https://www.postgresql.org/docs/
- N8N Postgres Node: https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.postgres/
- SQL Tutorial: https://www.postgresqltutorial.com/

---

## ✅ Checklist Setup

- [ ] PostgreSQL đã được cài đặt
- [ ] Database `document_management` đã được tạo
- [ ] User `doc_user` đã được tạo và có quyền
- [ ] Bảng `documents` đã được tạo
- [ ] Cột `docx_url` đã được thêm (nếu cần)
- [ ] Indexes đã được tạo
- [ ] Trigger `update_updated_at_column` đã được tạo
- [ ] N8N credential đã được cấu hình
- [ ] Node "Save Analysis to Postgres" đã được gán credential
- [ ] Test kết nối thành công
- [ ] Test insert dữ liệu thành công

---

**Chúc bạn setup thành công! 🎉**

