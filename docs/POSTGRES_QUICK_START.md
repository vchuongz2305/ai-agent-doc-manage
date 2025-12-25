# PostgreSQL Quick Start Guide

## 🚀 Setup Nhanh (Tự Động)

### Sử dụng Script Tự Động

```bash
# Chạy script setup
cd /home/danghongnguyen/Downloads/ai-agent-doc-manage
./scripts/setup-postgres.sh

# Hoặc với tham số tùy chỉnh
./scripts/setup-postgres.sh document_management doc_user your_password
```

Script sẽ tự động:
- ✅ Kiểm tra PostgreSQL đã cài đặt
- ✅ Tạo database `document_management`
- ✅ Tạo user `doc_user`
- ✅ Chạy SQL scripts để tạo bảng
- ✅ Cấp quyền cần thiết

---

## 📝 Setup Thủ Công

### 1. Cài Đặt PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Tạo Database và User

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE document_management;
CREATE USER doc_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE document_management TO doc_user;
\q
```

### 3. Chạy SQL Scripts

```bash
psql -U doc_user -d document_management -f database/create_documents_table.sql
psql -U doc_user -d document_management -f database/add_docx_url_column.sql
```

---

## ⚙️ Cấu Hình N8N

1. Mở N8N: `https://n8n.aidocmanageagent.io.vn`
2. Vào **Settings** → **Credentials**
3. Click **Add Credential** → Chọn **Postgres**
4. Điền thông tin:
   ```
   Host: localhost
   Database: document_management
   User: doc_user
   Password: your_password
   Port: 5432
   ```
5. Click **Test** → **Save**

---

## 🧪 Test Kết Nối

```bash
# Test từ command line
psql -U doc_user -d document_management -h localhost -c "SELECT version();"

# Xem bảng đã tạo
psql -U doc_user -d document_management -h localhost -c "\dt"
```

---

## 📚 Tài Liệu Đầy Đủ

Xem file: [`POSTGRES_SETUP_COMPLETE.md`](./POSTGRES_SETUP_COMPLETE.md) để biết chi tiết.

---

## ❓ Troubleshooting

### Lỗi: "connection refused"
```bash
sudo systemctl start postgresql
sudo systemctl status postgresql
```

### Lỗi: "permission denied"
```sql
GRANT ALL PRIVILEGES ON DATABASE document_management TO doc_user;
\c document_management
GRANT ALL ON SCHEMA public TO doc_user;
```

### Lỗi: "relation 'documents' does not exist"
```bash
psql -U doc_user -d document_management -f database/create_documents_table.sql
```

---

**✅ Hoàn thành! Database đã sẵn sàng sử dụng.**

