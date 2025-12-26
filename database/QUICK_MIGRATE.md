# Hướng Dẫn Nhanh - Chạy Migration

## Vấn đề: Peer Authentication Failed

Nếu bạn gặp lỗi `Peer authentication failed`, đây là các cách giải quyết:

## Cách 1: Sử dụng Password Authentication (Khuyến nghị)

```bash
# Cách 1a: Nhập password khi được hỏi
PGPASSWORD='your_password' psql -U postgres -d document_management -f database/update_documents_schema.sql

# Cách 1b: Sử dụng script tự động
./database/migrate_with_auth.sh document_management postgres password
# Script sẽ hỏi password
```

## Cách 2: Sử dụng Localhost Connection

```bash
# Kết nối qua localhost (thường dùng password auth)
psql -U postgres -d document_management -h localhost -f database/update_documents_schema.sql

# Hoặc dùng script
./database/migrate_with_auth.sh document_management postgres local
```

## Cách 3: Sử dụng Sudo (nếu có quyền)

```bash
# Chuyển sang user postgres
sudo -u postgres psql -d document_management -f database/update_documents_schema.sql

# Hoặc dùng script
./database/migrate_with_auth.sh document_management postgres sudo
```

## Cách 4: Sử dụng Connection String

```bash
# Với connection string
DATABASE_URL='postgresql://postgres:password@localhost:5432/document_management' \
  psql "$DATABASE_URL" -f database/update_documents_schema.sql

# Hoặc dùng script
DATABASE_URL='postgresql://postgres:password@localhost:5432/document_management' \
  ./database/migrate_with_auth.sh document_management postgres connection_string
```

## Cách 5: Tự động thử tất cả phương thức

```bash
# Script sẽ tự động thử tất cả phương thức
./database/migrate_with_auth.sh document_management postgres auto
```

## Cách 6: Sửa pg_hba.conf (Cần quyền root)

Nếu bạn có quyền root và muốn thay đổi cấu hình PostgreSQL:

```bash
# Backup file cấu hình
sudo cp /etc/postgresql/*/main/pg_hba.conf /etc/postgresql/*/main/pg_hba.conf.backup

# Sửa file pg_hba.conf
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Thay đổi dòng:
# local   all             postgres                                peer
# Thành:
# local   all             postgres                                md5

# Hoặc thêm dòng mới:
# host    all             all             127.0.0.1/32            md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## Kiểm tra kết nối

Trước khi chạy migration, kiểm tra kết nối:

```bash
# Thử kết nối với password
PGPASSWORD='your_password' psql -U postgres -d document_management -c "SELECT version();"

# Thử kết nối qua localhost
psql -U postgres -d document_management -h localhost -c "SELECT version();"

# Thử với sudo
sudo -u postgres psql -d document_management -c "SELECT version();"
```

## Lưu ý

- **Cách 1 và 2** thường hoạt động tốt nhất
- **Cách 3** cần quyền sudo
- **Cách 4** hữu ích khi có connection string từ n8n hoặc ứng dụng khác
- **Cách 5** tự động thử tất cả, tiện nhất nhưng có thể chậm hơn

## Sau khi migration thành công

```sql
-- Kiểm tra schema
\d documents

-- Xem dữ liệu mẫu
SELECT processing_id, file_name, status FROM documents LIMIT 5;
```

