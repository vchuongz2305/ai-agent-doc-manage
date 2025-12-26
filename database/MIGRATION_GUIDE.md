# Hướng Dẫn Migration Database

## Tổng quan

Script migration này sẽ cập nhật schema bảng `documents` để phù hợp với workflow mới (không còn dùng Google Docs và DOCX export).

## Cách chạy Migration

### Cách 1: Sử dụng script bash (Khuyến nghị)

```bash
# Chạy với database và user mặc định
./database/migrate.sh

# Hoặc chỉ định database và user
./database/migrate.sh document_management postgres
```

### Cách 2: Chạy trực tiếp với psql

```bash
# Kết nối vào database
psql -U your_username -d your_database

# Chạy script migration
\i database/update_documents_schema.sql
```

### Cách 3: Chạy từ command line

```bash
psql -U your_username -d your_database -f database/update_documents_schema.sql
```

## Những gì script sẽ làm

1. ✅ Tạo bảng `documents` nếu chưa có
2. ✅ Thêm các cột cần thiết nếu thiếu:
   - `cloudinary_url` (URL PDF trên Cloudinary)
   - `analysis_results` (JSONB - kết quả phân tích)
   - `analysis_completed_at` (timestamp hoàn thành)
   - `docx_url` (giữ lại để tương thích, có thể NULL)
3. ✅ Chuyển `analysis_results` từ JSON sang JSONB nếu cần
4. ✅ Tạo các index cần thiết:
   - Index trên `processing_id`, `user_id`, `status`, `created_at`
   - GIN index trên `analysis_results` để query JSON hiệu quả
5. ✅ Tạo trigger tự động cập nhật `updated_at`

## Kiểm tra sau khi migration

```sql
-- Xem cấu trúc bảng
\d documents

-- Xem các index
\di documents*

-- Kiểm tra dữ liệu mẫu
SELECT 
    processing_id,
    file_name,
    cloudinary_url,
    status,
    analysis_results->>'main_theme' as main_theme
FROM documents
ORDER BY created_at DESC
LIMIT 5;
```

## Rollback (nếu cần)

Script migration này là **an toàn** và **idempotent** (có thể chạy nhiều lần mà không gây lỗi). Tuy nhiên, nếu cần rollback:

```sql
-- Xóa các cột mới (CHỈ NẾU CẦN THIẾT)
-- CẢNH BÁO: Sẽ mất dữ liệu!
ALTER TABLE documents DROP COLUMN IF EXISTS cloudinary_url;
ALTER TABLE documents DROP COLUMN IF EXISTS analysis_results;
ALTER TABLE documents DROP COLUMN IF EXISTS analysis_completed_at;
```

## Lưu ý

- ⚠️ Script migration **KHÔNG XÓA** dữ liệu hiện có
- ⚠️ Script migration **KHÔNG XÓA** cột `docx_url` (giữ lại để tương thích)
- ✅ Script có thể chạy nhiều lần an toàn
- ✅ Tất cả thay đổi đều có kiểm tra `IF NOT EXISTS` hoặc `IF EXISTS`

## Troubleshooting

### Lỗi: "permission denied"
```bash
# Cấp quyền cho user
GRANT ALL PRIVILEGES ON DATABASE your_database TO your_user;
GRANT ALL ON SCHEMA public TO your_user;
```

### Lỗi: "relation 'documents' does not exist"
- Script sẽ tự động tạo bảng nếu chưa có
- Nếu vẫn lỗi, kiểm tra database name có đúng không

### Lỗi: "column already exists"
- Không sao, script có kiểm tra `IF NOT EXISTS`
- Có thể bỏ qua warning này

## Schema sau khi migration

Xem chi tiết trong file [README_SCHEMA.md](./README_SCHEMA.md)

