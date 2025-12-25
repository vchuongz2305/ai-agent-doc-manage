# File URL Configuration

## Vấn đề

Khi N8N workflow cố gắng download file từ URL, có thể gặp lỗi:
```
ENOTFOUND api.aidocmanageagent.io.vn
```

Lỗi này xảy ra vì N8N không thể truy cập domain `api.aidocmanageagent.io.vn` hoặc domain này không tồn tại.

## Giải pháp

### 1. Cấu hình API_BASE_URL trong .env

Thêm biến môi trường `API_BASE_URL` vào file `.env`:

```bash
# URL base cho file downloads (N8N sẽ dùng URL này để download file)
# Nếu N8N và backend chạy trên cùng server, dùng localhost
API_BASE_URL=http://localhost:5000

# Hoặc nếu N8N và backend chạy trên server khác, dùng domain/IP public
# API_BASE_URL=https://api.aidocmanageagent.io.vn
# API_BASE_URL=http://your-server-ip:5000
```

### 2. Các tùy chọn cấu hình

#### Option 1: N8N và Backend trên cùng server
```bash
API_BASE_URL=http://localhost:5000
```

#### Option 2: N8N và Backend trên server khác (cùng network)
```bash
# Dùng IP nội bộ
API_BASE_URL=http://192.168.1.100:5000
```

#### Option 3: N8N và Backend trên server khác (public)
```bash
# Dùng domain public
API_BASE_URL=https://api.aidocmanageagent.io.vn

# Hoặc IP public
API_BASE_URL=http://your-public-ip:5000
```

#### Option 4: Development với ngrok
```bash
# Nếu dùng ngrok để expose localhost
API_BASE_URL=https://your-ngrok-url.ngrok.io
```

### 3. Kiểm tra cấu hình

Sau khi cấu hình, restart server:
```bash
npm start
```

Kiểm tra log để xem URL được sử dụng:
```bash
tail -f /tmp/backend.log
```

Khi upload file, bạn sẽ thấy log:
```
📁 File info: {
  originalName: '...',
  savedName: '...',
  filePath: '...',
  baseUrl: 'http://localhost:5000',
  fileUrl: 'http://localhost:5000/uploads/...'
}
```

### 4. Test URL

Test xem URL có hoạt động không:
```bash
# Test từ localhost
curl http://localhost:5000/uploads/your-file-name.pdf

# Test từ N8N server (nếu có SSH access)
curl http://your-api-url/uploads/your-file-name.pdf
```

### 5. Troubleshooting

#### Lỗi: ENOTFOUND
- Kiểm tra domain/IP có đúng không
- Kiểm tra firewall có chặn port 5000 không
- Kiểm tra N8N có thể truy cập được URL không

#### Lỗi: ECONNREFUSED
- Kiểm tra backend server có đang chạy không
- Kiểm tra port 5000 có đúng không
- Kiểm tra firewall rules

#### Lỗi: Timeout
- Kiểm tra network connectivity
- Kiểm tra file có quá lớn không
- Tăng timeout trong N8N HTTP Request node

## Lưu ý

- Nếu N8N chạy trên server khác với backend, **KHÔNG** dùng `localhost:5000`
- Phải dùng IP/domain mà N8N có thể truy cập được
- Đảm bảo firewall cho phép truy cập port 5000 từ N8N server

