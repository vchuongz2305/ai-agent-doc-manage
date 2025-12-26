# Environment Variables Configuration Guide

## 📋 Tổng Quan

Toàn bộ project sử dụng **1 file `.env` duy nhất** ở thư mục root để quản lý tất cả các biến môi trường.

## ✅ Cấu Trúc

```
ai-agent-doc-manage/
├── .env                 # File cấu hình chính (KHÔNG commit vào git)
├── .env.example         # Template file (CÓ thể commit)
├── load-env.js          # Utility để load .env từ root
└── api/
    └── *.js             # Tất cả file đều dùng require('../load-env')
```

## 🚀 Cách Sử Dụng

### 1. Tạo File .env

```bash
# Copy từ template
cp .env.example .env

# Hoặc tạo mới
touch .env
```

### 2. Cấu Hình Các Biến Môi Trường

Mở file `.env` và điền các giá trị:

```env
# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# N8N
N8N_API_KEY=your_api_key
N8N_WORKFLOW_ID_FLOW1=your_workflow_id

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_DATABASE=document_management
POSTGRES_USER=doc_user
POSTGRES_PASSWORD=your_password
```

### 3. Load Environment Variables

Tất cả các file trong project đều sử dụng `load-env.js`:

```javascript
// Trong bất kỳ file nào
require('../load-env');  // Từ thư mục api/
// hoặc
require('./load-env');   // Từ thư mục root
```

## 📝 Các Biến Môi Trường

### Cloudinary (Bắt buộc)

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Lấy từ:** https://cloudinary.com/console

### N8N (Bắt buộc)

```env
N8N_BASE_URL=https://n8n.aidocmanageagent.io.vn
N8N_API_KEY=your_api_key
N8N_WORKFLOW_ID_FLOW1=9ucTmgO083P7qCGQ
N8N_WORKFLOW_ID_FLOW2=
N8N_WORKFLOW_ID_FLOW3=
```

**Lấy API Key từ:** N8N Settings > API > Create API Key

### PostgreSQL (Bắt buộc)

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=document_management
POSTGRES_USER=doc_user
POSTGRES_PASSWORD=your_password
```

### API Configuration (Tùy chọn)

```env
API_BASE_URL=http://localhost:5000
NODE_ENV=development
```

## 🔧 Cách Hoạt Động

### 1. Utility File: `load-env.js`

File này được đặt ở root và tự động:
- Tìm file `.env` ở thư mục root
- Load tất cả biến môi trường vào `process.env`
- Hiển thị log khi load thành công/thất bại

### 2. Import trong Code

Tất cả các file đều import như sau:

```javascript
// Từ thư mục api/
require('../load-env');

// Từ thư mục root
require('./load-env');
```

### 3. Sử dụng Biến

Sau khi load, sử dụng như bình thường:

```javascript
const apiKey = process.env.N8N_API_KEY;
const dbHost = process.env.POSTGRES_HOST;
```

## ✅ Lợi Ích

1. **Nhất quán**: Tất cả file dùng cùng 1 file `.env`
2. **Dễ quản lý**: Chỉ cần cấu hình 1 lần
3. **Tránh lỗi**: Không còn lo về path khác nhau
4. **Dễ bảo trì**: Dễ dàng thêm/sửa biến môi trường

## 🧪 Kiểm Tra

### Test Load .env

```bash
# Start server và xem log
npm start

# Bạn sẽ thấy:
# ✅ Environment variables loaded from: /path/to/project/.env
```

### Test Biến Môi Trường

```javascript
// Trong bất kỳ file nào
require('../load-env');
console.log(process.env.CLOUDINARY_CLOUD_NAME);
```

## ⚠️ Lưu Ý

1. **KHÔNG commit file `.env`** vào git (đã có trong `.gitignore`)
2. **CÓ thể commit file `.env.example`** để làm template
3. **Đảm bảo file `.env` tồn tại** trước khi chạy ứng dụng
4. **Restart server** sau khi thay đổi `.env`

## 🔍 Troubleshooting

### Lỗi: "Environment variables loaded from: undefined"

**Nguyên nhân:** File `.env` không tồn tại

**Giải pháp:**
```bash
cp .env.example .env
# Điền các giá trị cần thiết
```

### Lỗi: "dotenv not found"

**Nguyên nhân:** Chưa cài đặt dotenv

**Giải pháp:**
```bash
npm install dotenv
```

### Biến môi trường không được load

**Nguyên nhân:** File không import `load-env.js`

**Giải pháp:**
```javascript
// Thêm vào đầu file
require('../load-env');
```

## 📚 Tài Liệu Tham Khảo

- [dotenv Documentation](https://github.com/motdotla/dotenv)
- [Environment Variables Best Practices](https://12factor.net/config)

