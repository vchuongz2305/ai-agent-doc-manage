# Quick Start - Tạo bảng GDPR

## Cách 1: Chạy script đơn giản (Khuyến nghị)

```bash
cd /home/danghongnguyen/Downloads/ai-agent-doc-manage
./database/create_tables_direct.sh
```

Script sẽ hỏi password nếu cần.

## Cách 2: Chạy với sudo postgres (Nếu có quyền sudo)

```bash
cd /home/danghongnguyen/Downloads/ai-agent-doc-manage
sudo -u postgres psql -d document_management -f database/create_gdpr_tables.sql
```

## Cách 3: Chạy trực tiếp SQL

Nếu bạn đã có quyền truy cập database, chạy:

```bash
psql -U nguyen -d document_management -h localhost -f database/create_gdpr_tables.sql
```

Hoặc nếu cần password:

```bash
PGPASSWORD=your_password psql -U nguyen -d document_management -h localhost -f database/create_gdpr_tables.sql
```

## Cách 4: Copy SQL và chạy trực tiếp trong psql

1. Mở psql:
```bash
psql -U nguyen -d document_management
```

2. Copy toàn bộ nội dung file `database/create_gdpr_tables.sql` và paste vào psql

## Kiểm tra bảng đã tạo

```bash
psql -U nguyen -d document_management -c "\dt gdpr*"
psql -U nguyen -d document_management -c "\dt document_sharing"
```

## Troubleshooting

### Lỗi: Peer authentication failed

**Giải pháp 1**: Sửa file `pg_hba.conf`:
```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Thay đổi dòng:
```
local   all             all                                     peer
```

Thành:
```
local   all             all                                     md5
```

Sau đó restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

**Giải pháp 2**: Chạy với sudo postgres:
```bash
sudo -u postgres psql -d document_management -f database/create_gdpr_tables.sql
```

### Lỗi: Database không tồn tại

Tạo database trước:
```bash
sudo -u postgres createdb document_management
```

### Lỗi: Permission denied

Cấp quyền cho user:
```bash
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE document_management TO nguyen;"
```

