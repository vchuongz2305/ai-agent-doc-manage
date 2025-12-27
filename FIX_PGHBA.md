# 🔧 Sửa lỗi pg_hba.conf - PostgreSQL Connection

## ❌ Lỗi hiện tại:
```
no pg_hba.conf entry for host "172.26.17.86", user "nguyen", database "document_management", no encryption
```

## 🔍 Nguyên nhân:
PostgreSQL đang từ chối kết nối từ IP `172.26.17.86` vì file `pg_hba.conf` không có entry cho phép kết nối từ IP này.

## ✅ Giải pháp nhanh:

### Option 1: Sử dụng script tự động
```bash
./scripts/fix-postgres-pghba.sh
```

### Option 2: Sửa thủ công

#### Bước 1: Tìm file pg_hba.conf
```bash
sudo find / -name pg_hba.conf 2>/dev/null
```

Thường ở:
- `/etc/postgresql/[version]/main/pg_hba.conf`
- `/var/lib/pgsql/[version]/data/pg_hba.conf`

#### Bước 2: Backup file
```bash
sudo cp /etc/postgresql/*/main/pg_hba.conf /etc/postgresql/*/main/pg_hba.conf.backup
```

#### Bước 3: Thêm entry vào pg_hba.conf
```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Thêm dòng này vào cuối file:
```
# Allow connections from local network
host    all             all             172.26.17.86/32            md5
host    all             all             127.0.0.1/32               md5
```

Hoặc cho phép tất cả IP (ít bảo mật hơn):
```
host    all             all             0.0.0.0/0                  md5
```

#### Bước 4: Reload PostgreSQL
```bash
sudo systemctl reload postgresql
# Hoặc restart nếu reload không work
sudo systemctl restart postgresql
```

## 🔐 Cấu hình bảo mật tốt hơn:

### 1. Chỉ cho phép localhost (khuyến nghị cho development)
```
host    all             all             127.0.0.1/32               md5
host    all             all             ::1/128                    md5
```

### 2. Cho phép từ subnet cụ thể
```
host    all             all             172.26.17.0/24             md5
```

### 3. Cho phép từ IP cụ thể
```
host    all             all             172.26.17.86/32            md5
```

## 🧪 Test kết nối:

```bash
# Test với user nguyen
psql -h localhost -U nguyen -d document_management -c "SELECT NOW();"

# Hoặc với user từ .env
psql -h localhost -U doc_user -d document_management -c "SELECT NOW();"
```

## ⚠️ Lưu ý về user "nguyen":

Nếu bạn đang dùng user `nguyen` thay vì `doc_user`, cần:

1. **Kiểm tra user có tồn tại:**
```bash
sudo -u postgres psql -c "\du"
```

2. **Tạo user nếu chưa có:**
```bash
sudo -u postgres psql -c "CREATE USER nguyen WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE document_management TO nguyen;"
```

3. **Cập nhật .env file:**
```env
POSTGRES_USER=nguyen
POSTGRES_PASSWORD=your_password
```

## 🔄 Sau khi sửa:

1. Restart backend:
```bash
npm start
```

2. Kiểm tra health endpoint:
```bash
curl http://localhost:5000/api/health/postgres
```

3. Kiểm tra logs - không còn lỗi `pg_hba.conf` nữa!

## 📚 Tham khảo thêm:

- [PostgreSQL pg_hba.conf Documentation](https://www.postgresql.org/docs/current/auth-pg-hba-conf.html)
- File troubleshooting: `POSTGRES_TROUBLESHOOTING.md`

