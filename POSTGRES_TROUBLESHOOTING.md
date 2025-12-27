# 🔧 PostgreSQL Troubleshooting Guide

## Vấn đề: Connection Timeout

Nếu bạn thấy lỗi `Connection terminated due to connection timeout` trong logs, đây là cách khắc phục:

## ✅ Giải pháp nhanh

### 1. Kiểm tra PostgreSQL status
```bash
./scripts/check-postgres.sh
```

### 2. Khởi động PostgreSQL (nếu chưa chạy)
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql  # Tự động khởi động khi boot
```

### 3. Kiểm tra health endpoint
```bash
curl http://localhost:5000/api/health/postgres
```

## 🔄 Circuit Breaker Pattern

Hệ thống đã được cải thiện với **Circuit Breaker Pattern**:

- **Sau 3 lần fail liên tiếp**: Circuit breaker sẽ mở
- **Thời gian chờ**: 30 giây trước khi thử lại
- **Lợi ích**: Giảm số lượng retry không cần thiết, giảm log noise

### Khi Circuit Breaker mở:
- API sẽ trả về HTTP 503 (Service Unavailable)
- Frontend sẽ nhận được empty arrays thay vì crash
- Hệ thống sẽ tự động thử lại sau 30 giây

## 📋 Kiểm tra cấu hình

### 1. Kiểm tra file `.env`
Đảm bảo các biến sau được cấu hình đúng:
```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=document_management
POSTGRES_USER=doc_user
POSTGRES_PASSWORD=your_password
```

### 2. Test kết nối thủ công
```bash
psql -h localhost -U doc_user -d document_management -c "SELECT NOW();"
```

### 3. Kiểm tra PostgreSQL logs
```bash
sudo journalctl -u postgresql -n 50
```

## 🚀 Setup PostgreSQL (nếu chưa có)

Nếu PostgreSQL chưa được setup, chạy:
```bash
./scripts/setup-postgres-now.sh
```

## 📊 Monitoring

### Health Check Endpoints:
- `GET /api/health` - General health check
- `GET /api/health/postgres` - PostgreSQL connection status

### Response từ `/api/health/postgres`:
```json
{
  "success": true,
  "postgres": {
    "connected": false,
    "lastCheck": "2024-01-01T00:00:00.000Z",
    "error": "Connection timeout",
    "circuitBreaker": {
      "open": true,
      "openUntil": "2024-01-01T00:00:30.000Z",
      "consecutiveFailures": 3
    }
  }
}
```

## 💡 Best Practices

1. **Luôn kiểm tra PostgreSQL status trước khi deploy**
2. **Sử dụng health check endpoints để monitor**
3. **Circuit breaker sẽ tự động retry sau 30s**
4. **Frontend sẽ không crash khi database down** (nhận empty arrays)

## ❓ Vẫn gặp vấn đề?

1. Kiểm tra firewall: `sudo ufw status`
2. Kiểm tra PostgreSQL config: `sudo nano /etc/postgresql/*/main/postgresql.conf`
3. Kiểm tra pg_hba.conf: `sudo nano /etc/postgresql/*/main/pg_hba.conf`
4. Restart PostgreSQL: `sudo systemctl restart postgresql`

