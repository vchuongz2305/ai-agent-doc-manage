# N8N Workflow Management API Endpoints

Backend đã có các API endpoints để quản lý N8N workflows. Tất cả endpoints đều yêu cầu N8N API Key được cấu hình trong `.env`.

## Cấu hình

Đảm bảo đã set `N8N_API_KEY` trong file `.env`:

```env
N8N_API_KEY=your_api_key_here
```

## API Endpoints

### 1. List All Workflows

**GET** `/api/n8n/workflows`

Lấy danh sách tất cả workflows trong N8N.

**Query Parameters:**
- `active` (optional): Filter workflows theo trạng thái active
  - `true`: Chỉ lấy workflows đang active
  - `false`: Chỉ lấy workflows đang inactive
  - Không có: Lấy tất cả workflows

**Example Request:**
```bash
# Lấy tất cả workflows
curl -X GET 'http://localhost:5000/api/n8n/workflows' \
  -H 'accept: application/json'

# Chỉ lấy workflows đang active
curl -X GET 'http://localhost:5000/api/n8n/workflows?active=true' \
  -H 'accept: application/json'
```

**Example Response:**
```json
{
  "success": true,
  "workflows": [
    {
      "id": "XoHMfHi0FLNWjqeF",
      "name": "Dang Hong Nguyen - Analyze document",
      "active": true,
      "nodes": [...],
      "connections": {...}
    }
  ],
  "count": 1
}
```

---

### 2. Get Workflow by ID

**GET** `/api/n8n/workflows/:id`

Lấy thông tin chi tiết của một workflow cụ thể.

**Path Parameters:**
- `id`: Workflow ID (ví dụ: `XoHMfHi0FLNWjqeF`)

**Example Request:**
```bash
curl -X GET 'http://localhost:5000/api/n8n/workflows/XoHMfHi0FLNWjqeF' \
  -H 'accept: application/json'
```

**Example Response:**
```json
{
  "success": true,
  "workflow": {
    "id": "XoHMfHi0FLNWjqeF",
    "name": "Dang Hong Nguyen - Analyze document",
    "active": true,
    "nodes": [...],
    "connections": {...}
  }
}
```

---

### 3. Activate Workflow

**POST** `/api/n8n/workflows/:id/activate`

Kích hoạt (activate) một workflow.

**Path Parameters:**
- `id`: Workflow ID

**Example Request:**
```bash
curl -X POST 'http://localhost:5000/api/n8n/workflows/XoHMfHi0FLNWjqeF/activate' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Workflow XoHMfHi0FLNWjqeF activated successfully",
  "workflow": {
    "id": "XoHMfHi0FLNWjqeF",
    "active": true,
    ...
  }
}
```

---

### 4. Deactivate Workflow

**POST** `/api/n8n/workflows/:id/deactivate`

Tắt (deactivate) một workflow.

**Path Parameters:**
- `id`: Workflow ID

**Example Request:**
```bash
curl -X POST 'http://localhost:5000/api/n8n/workflows/XoHMfHi0FLNWjqeF/deactivate' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Workflow XoHMfHi0FLNWjqeF deactivated successfully",
  "workflow": {
    "id": "XoHMfHi0FLNWjqeF",
    "active": false,
    ...
  }
}
```

---

### 5. Get Workflow Status

**GET** `/api/n8n/workflows/:id/status`

Kiểm tra trạng thái (active/inactive) của một workflow.

**Path Parameters:**
- `id`: Workflow ID

**Example Request:**
```bash
curl -X GET 'http://localhost:5000/api/n8n/workflows/XoHMfHi0FLNWjqeF/status' \
  -H 'accept: application/json'
```

**Example Response:**
```json
{
  "success": true,
  "workflowId": "XoHMfHi0FLNWjqeF",
  "active": true,
  "name": "Dang Hong Nguyen - Analyze document",
  "status": "active"
}
```

---

## Error Responses

Tất cả endpoints sẽ trả về error response nếu có lỗi:

```json
{
  "success": false,
  "error": "Error message",
  "message": "Human-readable error message"
}
```

**HTTP Status Codes:**
- `200`: Success
- `404`: Workflow not found
- `500`: Server error hoặc N8N API error

## Lưu ý

1. **API Key Required**: Tất cả endpoints yêu cầu `N8N_API_KEY` được cấu hình trong `.env`
2. **N8N Server**: Đảm bảo N8N server (`https://n8n.aidocmanageagent.io.vn`) có thể truy cập được
3. **Workflow ID**: Workflow ID có thể tìm trong file JSON của workflow (field `"id"`)

## Testing với Postman/Thunder Client

1. Import các endpoints vào Postman
2. Set base URL: `http://localhost:5000`
3. Test các endpoints với workflow ID thực tế

## Integration với Frontend

Có thể gọi các API này từ frontend để:
- Kiểm tra workflow status trước khi upload file
- Tự động activate workflow nếu chưa active
- Hiển thị trạng thái workflows trong UI

**Example Frontend Code:**
```javascript
// Check workflow status
const checkWorkflow = async (workflowId) => {
  const response = await fetch(`/api/n8n/workflows/${workflowId}/status`);
  const data = await response.json();
  return data;
};

// Activate workflow
const activateWorkflow = async (workflowId) => {
  const response = await fetch(`/api/n8n/workflows/${workflowId}/activate`, {
    method: 'POST'
  });
  const data = await response.json();
  return data;
};
```

