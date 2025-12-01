# Hướng dẫn Tự động Activate Webhook

## Tổng quan

Backend đã được cấu hình để **tự động activate workflow** trong N8N khi:
1. Upload file từ frontend
2. Gặp lỗi 404 (webhook chưa activate)

## Cách hoạt động

1. **Khi upload file**: Backend sẽ tự động thử activate workflow trước khi gửi request đến webhook
2. **Khi gặp lỗi 404**: Backend sẽ tự động activate workflow và retry request

## Setup

### Bước 1: Tạo N8N API Key

1. Đăng nhập vào N8N: `https://n8n.aidocmanageagent.io.vn`
2. Vào **Settings** > **API**
3. Click **Create API Key**
4. Copy API key

### Bước 2: Lấy Workflow ID

Workflow ID có thể tìm trong file JSON của workflow:
- Mở file `workflows/Flow 1.json`
- Tìm field `"id"` (ví dụ: `"id": "XoHMfHi0FLNWjqeF"`)

Hoặc trong N8N UI:
- Mở workflow
- URL sẽ có dạng: `https://n8n.aidocmanageagent.io.vn/workflow/XoHMfHi0FLNWjqeF`
- ID là phần cuối của URL

### Bước 3: Cấu hình Environment Variables

Tạo file `.env` trong thư mục root:

```bash
# Copy từ .env.example
cp .env.example .env
```

Chỉnh sửa file `.env`:

```env
# Cách 1: Sử dụng API Key (Recommended)
N8N_API_KEY=your_api_key_here

# Hoặc Cách 2: Sử dụng Username/Password
N8N_USERNAME=your_username
N8N_PASSWORD=your_password

# Workflow IDs
N8N_WORKFLOW_ID_FLOW1=XoHMfHi0FLNWjqeF
N8N_WORKFLOW_ID_FLOW2=your_flow2_id
N8N_WORKFLOW_ID_FLOW3=your_flow3_id
```

### Bước 4: Cài đặt dotenv (nếu chưa có)

```bash
npm install dotenv
```

### Bước 5: Load Environment Variables

Thêm vào đầu file `api/unified-document-agent.js`:

```javascript
require('dotenv').config();
```

## Sử dụng

Sau khi setup xong:

1. **Upload file từ frontend** - Backend sẽ tự động:
   - Activate workflow (nếu chưa activate)
   - Gửi request đến webhook
   - Retry nếu gặp lỗi 404

2. **Không cần vào N8N để activate thủ công** nữa!

## Troubleshooting

### Lỗi: "Cannot activate workflow: No N8N credentials configured"

**Giải pháp:**
- Kiểm tra file `.env` đã được tạo chưa
- Kiểm tra `N8N_API_KEY` hoặc `N8N_USERNAME`/`N8N_PASSWORD` đã được set chưa
- Đảm bảo đã load dotenv: `require('dotenv').config()`

### Lỗi: "Failed to activate workflow"

**Giải pháp:**
- Kiểm tra API key có đúng không
- Kiểm tra N8N server có accessible không
- Kiểm tra workflow ID có đúng không
- Kiểm tra quyền của API key/user có đủ để activate workflow không

### Workflow vẫn không activate

**Giải pháp:**
- Kiểm tra logs trong backend console
- Thử activate thủ công trong N8N một lần để đảm bảo workflow hoạt động
- Kiểm tra N8N API endpoint có đúng không

## Lưu ý

- API key method được recommend vì an toàn hơn
- Username/password method cần cookie-based authentication
- Auto-activation chỉ hoạt động nếu có credentials được cấu hình
- Nếu không có credentials, backend vẫn hoạt động nhưng sẽ không auto-activate

## Alternative: Production Mode

Nếu không muốn dùng API, có thể:
1. Activate workflow một lần trong N8N
2. Đảm bảo workflow luôn ở trạng thái Active
3. Sử dụng N8N production mode (workflows luôn active)

