# 🚀 Quick Fix - pg_hba.conf

## Lỗi:
```
no pg_hba.conf entry for host "172.26.17.86", user "nguyen"
```

## ⚡ Fix nhanh (chạy các lệnh này):

```bash
# 1. Backup file pg_hba.conf
sudo cp /etc/postgresql/17/main/pg_hba.conf /etc/postgresql/17/main/pg_hba.conf.backup

# 2. Thêm entry cho phép kết nối từ localhost và IP hiện tại
sudo bash -c 'cat >> /etc/postgresql/17/main/pg_hba.conf << EOF

# Allow connections from localhost
host    all             all             127.0.0.1/32               md5
host    all             all             ::1/128                    md5

# Allow connections from current network (172.26.17.0/24)
host    all             all             172.26.17.0/24             md5
EOF'

# 3. Reload PostgreSQL
sudo systemctl reload postgresql

# 4. Test kết nối
psql -h localhost -U nguyen -d document_management -c "SELECT NOW();"
```

## 🔍 Hoặc sửa thủ công:

```bash
# Mở file pg_hba.conf
sudo nano /etc/postgresql/17/main/pg_hba.conf

# Thêm các dòng này vào cuối file:
host    all    all    127.0.0.1/32    md5
host    all    all    ::1/128         md5
host    all    all    172.26.17.0/24  md5

# Save và reload
sudo systemctl reload postgresql
```

## ✅ Kiểm tra:

```bash
# Xem entries mới
sudo tail -5 /etc/postgresql/17/main/pg_hba.conf

# Test connection
psql -h localhost -U nguyen -d document_management
```

## 📝 Lưu ý về user "nguyen":

Nếu bạn dùng user `nguyen` thay vì `doc_user`, cần cập nhật file `.env`:

```env
POSTGRES_USER=nguyen
POSTGRES_PASSWORD=your_password_here
```

Sau đó restart backend:
```bash
npm start
```

