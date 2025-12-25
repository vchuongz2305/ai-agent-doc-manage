# 🚀 Hướng Dẫn Setup PostgreSQL

## ✅ PostgreSQL đã được cài đặt!

PostgreSQL version **17.7** đã có trên hệ thống của bạn.

## 📝 Các bước setup:

### Bước 1: Khởi động PostgreSQL service

```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Bước 2: Chạy script setup tự động

```bash
cd /home/danghongnguyen/Downloads/ai-agent-doc-manage
bash scripts/setup-postgres-now.sh
```

Script sẽ:
- ✅ Khởi động PostgreSQL service
- ✅ Tạo database `document_management`
- ✅ Tạo user `doc_user`
- ✅ Chạy SQL scripts để tạo bảng
- ✅ Cấp quyền cần thiết

**Lưu ý:** Bạn sẽ được yêu cầu nhập password cho user `doc_user`.

---

## 🔧 Hoặc setup thủ công:

### 1. Khởi động PostgreSQL

```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Tạo database và user

```bash
sudo -u postgres psql
```

Sau đó chạy các lệnh SQL:

```sql
-- Tạo database
CREATE DATABASE document_management;

-- Tạo user
CREATE USER doc_user WITH PASSWORD 'your_password_here';

-- Cấp quyền
GRANT ALL PRIVILEGES ON DATABASE document_management TO doc_user;

-- Kết nối vào database
\c document_management

-- Cấp quyền schema
GRANT ALL ON SCHEMA public TO doc_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO doc_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO doc_user;

-- Thoát
\q
```

### 3. Chạy SQL scripts

```bash
cd /home/danghongnguyen/Downloads/ai-agent-doc-manage

# Tạo bảng documents
PGPASSWORD='your_password_here' psql -U doc_user -d document_management -h localhost -f database/create_documents_table.sql

# Thêm cột docx_url
PGPASSWORD='your_password_here' psql -U doc_user -d document_management -h localhost -f database/add_docx_url_column.sql
```

---

## 🧪 Test kết nối

```bash
# Test với password
PGPASSWORD='your_password' psql -U doc_user -d document_management -h localhost -c "SELECT version();"

# Hoặc test tương tác
PGPASSWORD='your_password' psql -U doc_user -d document_management -h localhost
```

Trong psql:
```sql
-- Xem danh sách bảng
\dt

-- Xem cấu trúc bảng
\d documents

-- Thoát
\q
```

---

## ⚙️ Cấu hình N8N

Sau khi setup xong, cấu hình trong N8N:

1. Mở N8N: `https://n8n.aidocmanageagent.io.vn`
2. Vào **Settings** → **Credentials**
3. Click **Add Credential** → Chọn **Postgres**
4. Điền thông tin:
   ```
   Name: PostgreSQL - Document Management
   Host: localhost
   Database: document_management
   User: doc_user
   Password: [password bạn đã tạo]
   Port: 5432
   SSL: Disable
   ```
5. Click **Test** → **Save**

---

## ✅ Checklist

- [ ] PostgreSQL service đã khởi động
- [ ] Database `document_management` đã được tạo
- [ ] User `doc_user` đã được tạo
- [ ] Bảng `documents` đã được tạo
- [ ] Cột `docx_url` đã được thêm
- [ ] Test kết nối thành công
- [ ] N8N credential đã được cấu hình

---

## ❓ Troubleshooting

### Lỗi: "could not connect to server"

```bash
# Kiểm tra service
sudo systemctl status postgresql

# Khởi động lại
sudo systemctl restart postgresql
```

### Lỗi: "permission denied"

Đảm bảo đã cấp quyền cho user:
```sql
GRANT ALL PRIVILEGES ON DATABASE document_management TO doc_user;
```

### Lỗi: "relation 'documents' does not exist"

Chạy lại SQL script:
```bash
PGPASSWORD='your_password' psql -U doc_user -d document_management -h localhost -f database/create_documents_table.sql
```

---

**Chúc bạn setup thành công! 🎉**

