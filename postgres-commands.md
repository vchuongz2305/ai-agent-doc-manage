# Các câu lệnh Postgres phổ biến

## 1. Quản lý Postgres Service

### Khởi động Postgres
```bash
# Ubuntu/Debian
sudo systemctl start postgresql
# hoặc
sudo service postgresql start

# Kiểm tra trạng thái
sudo systemctl status postgresql
```

### Dừng Postgres
```bash
sudo systemctl stop postgresql
# hoặc
sudo service postgresql stop
```

### Khởi động lại Postgres
```bash
sudo systemctl restart postgresql
# hoặc
sudo service postgresql restart
```

## 2. Kết nối vào Postgres

### Kết nối với user mặc định (postgres)
```bash
sudo -u postgres psql
```

### Kết nối vào database cụ thể
```bash
sudo -u postgres psql -d your_database_name
```

### Kết nối với user và database cụ thể
```bash
psql -U username -d database_name -h localhost
```

### Kết nối từ xa
```bash
psql -h hostname -U username -d database_name
```

## 3. Các câu lệnh SQL cơ bản

### Xem danh sách databases
```sql
\l
-- hoặc
SELECT datname FROM pg_database;
```

### Tạo database mới
```sql
CREATE DATABASE your_database_name;
```

### Kết nối vào database
```sql
\c your_database_name
```

### Xem danh sách tables
```sql
\dt
-- hoặc
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

### Xem cấu trúc bảng
```sql
\d table_name
-- hoặc
\d+ table_name  -- chi tiết hơn
```

### Xem dữ liệu trong bảng `documents`
```sql
SELECT * FROM documents;
```

### Xem dữ liệu với giới hạn
```sql
SELECT * FROM documents LIMIT 10;
```

### Xem dữ liệu theo processing_id
```sql
SELECT * FROM documents WHERE processing_id = 'your_processing_id';
```

### Xem các cột trong bảng
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'documents';
```

## 4. Các câu lệnh hữu ích cho workflow

### Kiểm tra dữ liệu mới nhất
```sql
SELECT * FROM documents 
ORDER BY created_at DESC 
LIMIT 5;
```

### Kiểm tra documents đã hoàn thành
```sql
SELECT processing_id, file_name, status, created_at, analysis_completed_at 
FROM documents 
WHERE status = 'completed'
ORDER BY analysis_completed_at DESC;
```

### Xem analysis_results của một document
```sql
SELECT 
    processing_id,
    file_name,
    analysis_results->>'main_theme' as main_theme,
    analysis_results->'document_summary' as document_summary
FROM documents 
WHERE processing_id = 'your_processing_id';
```

### Đếm số documents
```sql
SELECT COUNT(*) FROM documents;
```

### Đếm theo status
```sql
SELECT status, COUNT(*) 
FROM documents 
GROUP BY status;
```

### Xóa dữ liệu (cẩn thận!)
```sql
-- Xóa một record
DELETE FROM documents WHERE processing_id = 'your_processing_id';

-- Xóa tất cả (cẩn thận!)
-- TRUNCATE TABLE documents;
```

### Cập nhật dữ liệu
```sql
UPDATE documents 
SET status = 'completed', 
    analysis_completed_at = NOW() 
WHERE processing_id = 'your_processing_id';
```

## 5. Thoát khỏi psql
```sql
\q
-- hoặc
exit
```

## 6. Export/Import dữ liệu

### Export database
```bash
pg_dump -U username -d database_name > backup.sql
```

### Import database
```bash
psql -U username -d database_name < backup.sql
```

### Export bảng cụ thể
```bash
pg_dump -U username -d database_name -t table_name > table_backup.sql
```

## 7. Kiểm tra kết nối từ n8n

### Test kết nối
```sql
SELECT version();
```

### Kiểm tra user hiện tại
```sql
SELECT current_user;
```

### Kiểm tra database hiện tại
```sql
SELECT current_database();
```

## 8. Xem logs Postgres

### Xem logs trên Ubuntu/Debian
```bash
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Xem logs trên CentOS/RHEL
```bash
sudo tail -f /var/lib/pgsql/data/log/postgresql-*.log
```

