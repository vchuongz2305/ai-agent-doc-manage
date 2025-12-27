# 📚 Tài Liệu Flow 3: Document Sharing Workflow

## 📋 Tổng Quan

Flow 3 là workflow tự động hóa việc chia sẻ tài liệu sau khi đã được kiểm tra GDPR (Flow 2). Workflow này nhận dữ liệu từ frontend và Flow 2, sau đó thực hiện:
1. Xử lý và validate dữ liệu đầu vào
2. Tạo link chia sẻ
3. Cấp quyền truy cập Google Drive
4. Gửi email thông báo
5. Lưu kết quả vào PostgreSQL

---

## 🔄 Luồng Dữ Liệu Tổng Quan

```
Frontend (SharingPage.jsx)
    ↓ POST /api/document/trigger-sharing
Backend API (unified-document-agent.js)
    ↓ POST https://n8n.aidocmanageagent.io.vn/webhook/document-sharing
N8N Workflow (Flow 3.json)
    ├─→ 1️⃣ Webhook Trigger
    ├─→ 2️⃣ Xử lý dữ liệu từ Flow 2 + Frontend
    ├─→ 7️⃣ Tạo link chia sẻ
    ├─→ 🔐 Chuẩn bị quyền truy cập
    ├─→ 🔐 Cấp quyền Google Drive
    ├─→ 🛡️ Xử lý kết quả cấp quyền
    ├─→ 8️⃣ Gửi thông báo chia sẻ (Gmail)
    ├─→ 📊 Merge Email Data
    ├─→ 9️⃣.5️⃣ Format Data cho PostgreSQL
    └─→ 9️⃣ Lưu kết quả chia sẻ vào PostgreSQL
```

---

## 🎨 Frontend: SharingPage.jsx

### Vị trí: `frontend/src/pages/SharingPage.jsx`

### Chức năng chính:

#### 1. **Chọn File và Người Nhận**
- Người dùng chọn file đã được phân tích và kiểm tra GDPR
- Chọn người nhận từ danh sách bộ phận (IT, HR, Finance)
- Hoặc nhập trực tiếp tên và email theo format:
  - `Tên - Email` (ví dụ: `Nguyễn Văn A - nguyenvana@example.com`)
  - `Email` (chỉ email)
  - `Tên <Email>` hoặc `Email (Tên)`

#### 2. **Gửi Request Chia Sẻ**

**Code chính (dòng 252-307):**

```javascript
const response = await fetch('/api/document/trigger-sharing', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    processingId: selectedFile.processing_id,
    department: selectedDepartment,
    recipient_emails: allEmails,
    recipient_names: allNames,
    recipientEmails: allEmails,
    recipientNames: allNames,
    recipients: validRecipients,
    sharingEmails: allEmails.join(','),
    selectedUsers: selectedUsers,
    userId: selectedUsers.length > 0 ? selectedUsers[0].id : 'default-user',
    // GDPR data từ file đã chọn
    gdpr_decision: selectedFile.gdpr_result?.gdpr_decision,
    legal_basis: selectedFile.gdpr_result?.legal_basis,
    retention_days: selectedFile.gdpr_result?.retention_days,
    file_name: selectedFile.file_name,
    file_url: selectedFile.file_url || selectedFile.cloudinary_url,
    cloudinary_url: selectedFile.cloudinary_url
  })
});
```

**Dữ liệu gửi đi:**
- `processingId`: ID của file đã được xử lý
- `recipient_emails`: Mảng email người nhận
- `recipient_names`: Mảng tên người nhận (tương ứng với emails)
- `recipients`: Mảng đầy đủ với `{name, email, source}`
- GDPR data: `gdpr_decision`, `legal_basis`, `retention_days`
- File info: `file_name`, `file_url`, `cloudinary_url`

#### 3. **Theo Dõi Trạng Thái**

**Status Polling (dòng 310-335):**
```javascript
const startStatusPolling = (id) => {
  const interval = setInterval(async () => {
    const response = await fetch(`/api/document/status/${id}`);
    const statusData = await response.json();
    setStatus(statusData);
    
    if (statusData.results?.sharing) {
      setResult(statusData.results.sharing);
      clearInterval(interval);
    }
  }, 2000);
};
```

---

## 🔧 Backend API: unified-document-agent.js

### Endpoint: `POST /api/document/trigger-sharing`

### Vị trí: `api/unified-document-agent.js` (dòng 1615-1850)

### Quy trình xử lý:

#### 1. **Validate Input** (dòng 1628-1640)
```javascript
if (!processingId) {
  return res.status(400).json({
    success: false,
    error: 'processingId is required'
  });
}

if (!recipient_emails || (Array.isArray(recipient_emails) && recipient_emails.length === 0)) {
  return res.status(400).json({
    success: false,
    error: 'recipient_emails is required and must not be empty'
  });
}
```

#### 2. **Lấy Dữ Liệu từ PostgreSQL** (dòng 1649-1715)

**Query Document:**
```sql
SELECT 
  processing_id, file_name, file_url, cloudinary_url,
  user_id, department, status, analysis_results,
  docx_url, created_at, updated_at, analysis_completed_at
FROM documents
WHERE processing_id = $1
ORDER BY created_at DESC
LIMIT 1
```

**Query GDPR Data:**
```sql
SELECT 
  gdpr_decision, gdpr_justification, legal_basis,
  retention_days, redaction_fields, personal_data_found,
  sensitive_data_detected, data_volume, notify_dpo,
  gdpr_action_performed, ai_decision_timestamp, gdpr_completed_at
FROM gdpr_compliance_results
WHERE processing_id = $1
ORDER BY created_at DESC
LIMIT 1
```

#### 3. **Format Recipients** (dòng 1717-1734)
```javascript
let finalRecipientEmails = [];
let finalRecipientNames = [];

if (recipients && Array.isArray(recipients)) {
  // Nếu có recipients array với name và email
  finalRecipientEmails = recipients.map(r => r.email).filter(Boolean);
  finalRecipientNames = recipients.map(r => r.name || '').filter(Boolean);
} else {
  // Fallback: dùng recipient_emails và recipient_names
  finalRecipientEmails = Array.isArray(recipient_emails) ? recipient_emails : [recipient_emails].filter(Boolean);
  finalRecipientNames = Array.isArray(recipient_names) ? recipient_names : (recipient_names ? [recipient_names] : []);
}
```

#### 4. **Chuẩn Bị Dữ Liệu cho Flow 3** (dòng 1736-1789)
```javascript
const sharingData = {
  // File info
  processing_id: documentData.processing_id,
  file_name: documentData.file_name,
  file_url: documentData.file_url || documentData.cloudinary_url,
  cloudinary_url: documentData.cloudinary_url,
  docx_url: documentData.docx_url || null,
  
  // User info
  user_id: documentData.user_id || null,
  department: department || documentData.department || null,
  
  // Recipients
  recipient_emails: finalRecipientEmails,
  recipient_names: finalRecipientNames,
  recipients: recipients || finalRecipientEmails.map((email, index) => ({
    name: finalRecipientNames[index] || '',
    email: email
  })),
  
  // Sharing settings
  sharing_method: sharing_method,
  access_level: access_level,
  
  // GDPR data
  gdpr_decision: gdprData?.gdpr_decision || null,
  legal_basis: gdprData?.legal_basis || null,
  retention_days: gdprData?.retention_days || 30,
  
  // Metadata
  gdpr_approved: true,
  status: 'pending',
  sharing_status: 'queued',
  workflow_source: 'flow3-document-sharing'
};
```

#### 5. **Gửi Request đến N8N Workflow** (dòng 1796-1823)
```javascript
const SHARING_WEBHOOK_URL = process.env.N8N_SHARING_WEBHOOK_URL || 
                             'https://n8n.aidocmanageagent.io.vn/webhook/document-sharing';

const sharingResponse = await axios.post(SHARING_WEBHOOK_URL, sharingData, {
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

res.json({
  success: true,
  message: 'Document Sharing workflow triggered successfully',
  processingId: processingId,
  recipients: finalRecipientEmails.length,
  needApproval: false
});
```

---

## 🔄 N8N Workflow: Flow 3.json

### Webhook URL: `https://n8n.aidocmanageagent.io.vn/webhook/document-sharing`

### Các Node trong Workflow:

#### 1️⃣ **Webhook Trigger** (Node ID: `1ec23240-191a-4746-8acf-f107bd86a816`)
- **Type**: `n8n-nodes-base.webhook`
- **Path**: `document-sharing`
- **Method**: `POST`
- **Chức năng**: Nhận request từ backend API

#### 2️⃣ **Xử lý dữ liệu từ Flow 2 + Frontend** (Node ID: `56a8ff91-cd03-42aa-9521-c26ab3904762`)
- **Type**: `n8n-nodes-base.code`
- **Chức năng**: Parse và validate dữ liệu đầu vào

**Code chính:**
```javascript
// Parse dữ liệu từ Flow 2 (GDPR Compliance)
const processingId = input.processing_id || input.processingId || body.processing_id || body.processingId || null;
const fileName = input.file_name || input.fileName || body.file_name || body.fileName || null;
const fileUrl = input.file_url || input.fileUrl || body.file_url || body.fileUrl || null;

// Parse dữ liệu email từ Frontend
let recipientEmails = [];
if (input.recipient_emails) {
  recipientEmails = Array.isArray(input.recipient_emails) 
    ? input.recipient_emails 
    : String(input.recipient_emails).split(',').map(e => e.trim());
}

// Validate emails
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
recipientEmails = recipientEmails.filter(email => email && emailRegex.test(email.trim()));

// Tạo dữ liệu hoàn chỉnh
const processedData = {
  processing_id: processingId,
  sharing_id: `share_${processingId}_${Date.now()}`,
  file_name: fileName || 'Unknown',
  recipient_emails: recipientEmails,
  gdpr_decision: gdprDecision,
  gdpr_approved: true,
  legal_basis: legalBasis,
  retention_days: retentionDays,
  status: 'pending',
  sharing_status: 'queued',
  // ... các trường khác
};
```

**Output**: Dữ liệu đã được xử lý và validate

#### 7️⃣ **Tạo link chia sẻ** (Node ID: `c1b2e322-7b3c-4d39-b82f-9a69f072d2be`)
- **Type**: `n8n-nodes-base.code`
- **Chức năng**: Chuẩn bị dữ liệu cho việc chia sẻ

**Code chính:**
```javascript
const processedData = {
  ...inputData,
  documentTitle: inputData.file_name || inputData.documentTitle || 'Tài liệu',
  webViewLink: inputData.file_url || inputData.cloudinary_url || inputData.webViewLink || '',
  shareWithEmails: inputData.recipient_emails || inputData.shareWithEmails || [],
  accessLevel: inputData.access_level || inputData.accessLevel || 'viewer',
  expirationDays: inputData.retention_days || inputData.expirationDays || 30,
  sharingReason: inputData.sharingReason || `Chia sẻ tài liệu ${inputData.file_name || 'này'} sau khi đã kiểm tra GDPR`,
  // Tạo email content
  emailSubject: `📄 Tài liệu được chia sẻ: ${processedData.documentTitle}`,
  emailMessage: `**TÀI LIỆU ĐÃ ĐƯỢC CHIA SẺ VỚI BẠN**\n\n...`
};
```

#### 🔐 **Chuẩn bị quyền truy cập** (Node ID: `f53202ef-91b5-4912-9665-39f58e2e00c3`)
- **Type**: `n8n-nodes-base.code`
- **Chức năng**: Tạo danh sách permissions cho Google Drive

**Code chính:**
```javascript
const fileId = inputData.originalFileId || inputData.fileId || inputData.processing_id;
const accessLevel = inputData.accessLevel || inputData.access_level || 'reader';

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validEmails = shareWithEmails.filter(email => {
  return email && typeof email === 'string' && emailRegex.test(email.trim());
}).map(email => email.trim());

// Tạo danh sách quyền cho tất cả email hợp lệ
const permissions = validEmails.map(email => ({
  role: accessLevel === 'writer' ? 'writer' : 'reader',
  type: 'user',
  emailAddress: email
}));

const driveShareData = {
  fileId: fileId,
  permissions: permissions,
  sendNotificationEmails: false,
  supportsAllDrives: true,
  ...inputData
};
```

#### 🔐 **Cấp quyền Google Drive** (Node ID: `d7e290fe-5b33-4eeb-9c5d-316f831860e0`)
- **Type**: `n8n-nodes-base.code`
- **Chức năng**: Mô phỏng cấp quyền Google Drive (hiện tại là mock)

**Code chính:**
```javascript
const permissionResults = [];
let successCount = 0;
let errorCount = 0;

for (let i = 0; i < permissions.length; i++) {
  const permission = permissions[i];
  const email = permission.emailAddress;
  const role = permission.role;
  
  // Mô phỏng API call thành công
  const result = {
    email: email,
    role: role,
    status: 'SUCCESS',
    grantedAt: new Date().toISOString(),
    permissionId: `perm_${Date.now()}_${i}`
  };
  
  permissionResults.push(result);
  successCount++;
}

const finalResult = {
  ...inputData,
  permissionResults: permissionResults,
  successCount: successCount,
  errorCount: errorCount,
  permissionStatus: errorCount === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS'
};
```

**Lưu ý**: Node này hiện đang mock việc cấp quyền. Trong thực tế, cần tích hợp với Google Drive API.

#### 🛡️ **Xử lý kết quả cấp quyền** (Node ID: `db60dfe2-a4e8-4637-9d57-8b32a9de319b`)
- **Type**: `n8n-nodes-base.code`
- **Chức năng**: Xử lý và format kết quả cấp quyền

**Code chính:**
```javascript
let permissionStatus = 'SUCCESS';
let sharedWithCount = 0;

if (inputData.permissionStatus) {
  permissionStatus = inputData.permissionStatus;
  sharedWithCount = inputData.successCount || 0;
}

const resultData = {
  ...originalData,
  permissionStatus,
  sharedWithCount,
  permissionsGrantedAt: new Date().toISOString(),
  grantedPermissions: emails.map(email => ({
    email,
    role: originalData.accessLevel || 'reader',
    grantedAt: new Date().toISOString()
  }))
};
```

#### 8️⃣ **Gửi thông báo chia sẻ** (Node ID: `fc430108-c572-4d71-a229-abec5a3cf08f`)
- **Type**: `n8n-nodes-base.gmail`
- **Chức năng**: Gửi email thông báo chia sẻ

**Cấu hình:**
```javascript
sendTo: emails.join(','),
subject: `📄 Tài liệu được chia sẻ: ${$json.documentTitle || $json.file_name || 'Tài liệu'}`,
message: `**TÀI LIỆU ĐÃ ĐƯỢC CHIA SẺ VỚI BẠN**

📄 **Tiêu đề:** ${docTitle}
📂 **Loại:** ${docCategory}
👥 **Chia sẻ bởi:** Document Management Agent
🔐 **Quyền truy cập:** ${accessLevel}
⏰ **Hết hạn:** ${expirationDate}

**Thông tin GDPR:**
- Quyết định GDPR: ${gdprDecision}
- Cơ sở pháp lý: ${legalBasis}
- Thời gian lưu trữ: ${retentionDays} ngày

🔗 **Link truy cập:**
${webViewLink}`
```

#### 📊 **Merge Email Data** (Node ID: `9ceb6807-7b42-4885-93a8-29032494892d`)
- **Type**: `n8n-nodes-base.code`
- **Chức năng**: Merge dữ liệu từ email response với dữ liệu gốc

**Code chính:**
```javascript
const emailResponse = $json; // Response từ Gmail node
const originalData = $input.first().json || {}; // Dữ liệu từ node trước

const mergedData = {
  ...originalData,
  emailId: emailResponse.id || null,
  emailThreadId: emailResponse.threadId || null,
  emailSentAt: new Date().toISOString(),
  email_sent: true,
  email_sent_at: new Date().toISOString(),
  email_subject: originalData.emailSubject || originalData.email_subject,
  email_body: originalData.emailMessage || originalData.email_body,
  status: 'sent',
  sharing_status: 'completed',
  sharing_completed_at: new Date().toISOString(),
  flow3_completed: true
};
```

#### 9️⃣.5️⃣ **Format Data cho PostgreSQL** (Node ID: `format-data-for-postgres-flow3`)
- **Type**: `n8n-nodes-base.code`
- **Chức năng**: Format dữ liệu để insert vào PostgreSQL

**Code chính:**
```javascript
// Helper function để escape SQL strings
function escapeSQL(str) {
  if (!str) return null;
  return String(str).replace(/'/g, "''").replace(/\\/g, '\\\\');
}

// Helper function để format PostgreSQL array
function formatPostgresArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return 'ARRAY[]::TEXT[]';
  const escaped = arr.map(item => `'${escapeSQL(String(item))}'`).join(', ');
  return `ARRAY[${escaped}]`;
}

// Helper function để format timestamp
function formatTimestamp(value) {
  if (!value || value === '' || value === null || value === undefined) {
    return 'CURRENT_TIMESTAMP';
  }
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return 'CURRENT_TIMESTAMP';
    }
    return `'${date.toISOString()}'::timestamp`;
  } catch (e) {
    return 'CURRENT_TIMESTAMP';
  }
}

const result = {
  ...data,
  recipient_emails_sql: formatPostgresArray(data.recipient_emails || []),
  recipient_names_sql: formatPostgresArray(data.recipient_names || []),
  email_subject_sql: data.email_subject ? `'${escapeSQL(data.email_subject)}'` : 'NULL',
  email_body_sql: data.email_body ? `'${escapeSQL(data.email_body)}'` : 'NULL',
  created_at_sql: formatTimestamp(data.created_at),
  updated_at_sql: formatTimestamp(data.updated_at),
  email_sent_at_sql: data.email_sent_at && data.email_sent_at !== '' ? formatTimestamp(data.email_sent_at) : 'NULL'
};
```

#### 9️⃣ **Lưu kết quả chia sẻ vào PostgreSQL** (Node ID: `58b052b2-994e-4214-869d-69701748e080`)
- **Type**: `n8n-nodes-base.postgres`
- **Operation**: `executeQuery`
- **Chức năng**: Insert hoặc update vào bảng `document_sharing`

**SQL Query:**
```sql
INSERT INTO document_sharing (
  processing_id, sharing_id, file_name, file_url, cloudinary_url, docx_url, 
  user_id, department, recipient_emails, recipient_names, sharing_method, 
  share_link, access_level, gdpr_decision, gdpr_approved, legal_basis, 
  retention_days, status, sharing_status, email_sent, email_sent_at, 
  email_subject, email_body, created_at, updated_at, sharing_requested_at, 
  sharing_completed_at, workflow_source, flow3_completed, notes
) VALUES (
  '{{ $json.processing_id }}',
  '{{ $json.sharing_id }}',
  {{ $json.file_name ? `'${$json.file_name}'` : 'NULL' }},
  {{ $json.file_url ? `'${$json.file_url}'` : 'NULL' }},
  {{ $json.cloudinary_url ? `'${$json.cloudinary_url}'` : 'NULL' }},
  {{ $json.recipient_emails_sql }},
  {{ $json.recipient_names_sql }},
  '{{ $json.sharing_method || 'email' }}',
  '{{ $json.access_level || 'viewer' }}',
  {{ $json.gdpr_decision ? `'${$json.gdpr_decision}'` : 'NULL' }},
  {{ $json.gdpr_approved !== undefined ? $json.gdpr_approved : true }},
  {{ $json.legal_basis ? `'${$json.legal_basis}'` : 'NULL' }},
  {{ $json.retention_days || 30 }},
  '{{ $json.status || 'sent' }}',
  {{ $json.email_sent_at_sql }},
  {{ $json.email_subject_sql }},
  {{ $json.email_body_sql }},
  {{ $json.created_at_sql }},
  {{ $json.updated_at_sql }},
  '{{ $json.workflow_source || 'flow3-document-sharing' }}',
  {{ $json.flow3_completed !== undefined ? $json.flow3_completed : true }},
  {{ $json.notes_sql }}
) ON CONFLICT (sharing_id) DO UPDATE SET
  status = EXCLUDED.status,
  sharing_status = EXCLUDED.sharing_status,
  email_sent = EXCLUDED.email_sent,
  email_sent_at = EXCLUDED.email_sent_at,
  email_subject = EXCLUDED.email_subject,
  email_body = EXCLUDED.email_body,
  sharing_completed_at = EXCLUDED.sharing_completed_at,
  flow3_completed = EXCLUDED.flow3_completed,
  updated_at = CURRENT_TIMESTAMP
RETURNING *;
```

---

## 🗄️ Database Schema: document_sharing

### Bảng: `document_sharing`

**Vị trí**: `database/create_tables_inline.sql` (dòng 40-73)

### Schema:

```sql
CREATE TABLE IF NOT EXISTS document_sharing (
    id SERIAL PRIMARY KEY,
    processing_id VARCHAR(255) NOT NULL,
    sharing_id VARCHAR(255) UNIQUE,
    file_name VARCHAR(500),
    file_url TEXT,
    cloudinary_url TEXT,
    docx_url TEXT,
    user_id VARCHAR(255),
    department VARCHAR(100),
    recipient_emails TEXT[],
    recipient_names TEXT[],
    sharing_method VARCHAR(50),
    share_link TEXT,
    access_level VARCHAR(50) DEFAULT 'viewer',
    gdpr_decision VARCHAR(50),
    gdpr_approved BOOLEAN DEFAULT FALSE,
    legal_basis VARCHAR(100),
    retention_days INTEGER,
    status VARCHAR(50) DEFAULT 'pending',
    sharing_status VARCHAR(50),
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP,
    email_subject TEXT,
    email_body TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sharing_requested_at TIMESTAMP,
    sharing_completed_at TIMESTAMP,
    workflow_source VARCHAR(100) DEFAULT 'flow3-document-sharing',
    flow3_completed BOOLEAN DEFAULT FALSE,
    notes TEXT
);
```

### Indexes:

```sql
CREATE INDEX IF NOT EXISTS idx_sharing_processing_id ON document_sharing(processing_id);
CREATE INDEX IF NOT EXISTS idx_sharing_sharing_id ON document_sharing(sharing_id);
CREATE INDEX IF NOT EXISTS idx_sharing_user_id ON document_sharing(user_id);
CREATE INDEX IF NOT EXISTS idx_sharing_status ON document_sharing(status);
CREATE INDEX IF NOT EXISTS idx_sharing_gdpr_approved ON document_sharing(gdpr_approved);
CREATE INDEX IF NOT EXISTS idx_sharing_created_at ON document_sharing(created_at);
```

### Các Trường Quan Trọng:

- **`processing_id`**: ID của file đã được xử lý (liên kết với bảng `documents`)
- **`sharing_id`**: ID duy nhất cho mỗi lần chia sẻ (format: `share_{processing_id}_{timestamp}`)
- **`recipient_emails`**: Mảng email người nhận (TEXT[])
- **`recipient_names`**: Mảng tên người nhận (TEXT[])
- **`gdpr_decision`**: Quyết định GDPR từ Flow 2 (`allow`, `anonymize`, `delete`)
- **`gdpr_approved`**: Đã được frontend approve để chia sẻ
- **`email_sent`**: Đã gửi email hay chưa
- **`email_sent_at`**: Thời gian gửi email
- **`flow3_completed`**: Workflow đã hoàn thành hay chưa

---

## 🔗 API Endpoints Liên Quan

### 1. **POST /api/document/trigger-sharing**
- **Mô tả**: Trigger Flow 3 workflow để chia sẻ tài liệu
- **Request Body**:
  ```json
  {
    "processingId": "doc_1234567890_abc",
    "recipient_emails": ["user1@example.com", "user2@example.com"],
    "recipient_names": ["Nguyễn Văn A", "Trần Thị B"],
    "department": "IT",
    "sharing_method": "email",
    "access_level": "viewer"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Document Sharing workflow triggered successfully",
    "processingId": "doc_1234567890_abc",
    "recipients": 2,
    "needApproval": false
  }
  ```

### 2. **GET /api/document/status/:processingId**
- **Mô tả**: Lấy trạng thái xử lý của document
- **Response**:
  ```json
  {
    "id": "doc_1234567890_abc",
    "status": "completed",
    "steps": {
      "analysis": "completed",
      "gdpr": "completed",
      "sharing": "completed"
    },
    "results": {
      "sharing": {
        "status": "sent",
        "recipients": ["user1@example.com", "user2@example.com"],
        "email_sent": true
      }
    }
  }
  ```

### 3. **GET /api/approvals/list?status=PENDING**
- **Mô tả**: Lấy danh sách approvals (nếu cần phê duyệt)
- **Query Params**: `status` (ALL, PENDING, APPROVED, REJECTED)
- **Response**:
  ```json
  {
    "approvals": [
      {
        "uniqueKey": "share_doc_123_1234567890",
        "documentTitle": "Tài liệu ABC",
        "status": "PENDING",
        "shareWithEmails": ["user1@example.com"],
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
  ```

---

## 🔄 Luồng Xử Lý Chi Tiết

### Bước 1: Frontend Gửi Request
1. Người dùng chọn file và người nhận trên `SharingPage.jsx`
2. Click "Chia Sẻ Tài Liệu"
3. Frontend gửi POST request đến `/api/document/trigger-sharing`

### Bước 2: Backend Xử Lý
1. Validate `processingId` và `recipient_emails`
2. Query PostgreSQL để lấy:
   - Document data từ bảng `documents`
   - GDPR data từ bảng `gdpr_compliance_results`
3. Format recipients (emails và names)
4. Chuẩn bị `sharingData` với đầy đủ thông tin
5. Gửi POST request đến N8N webhook

### Bước 3: N8N Workflow Xử Lý
1. **Webhook Trigger**: Nhận request
2. **Xử lý dữ liệu**: Parse và validate input
3. **Tạo link chia sẻ**: Chuẩn bị email content
4. **Chuẩn bị quyền**: Tạo permissions array
5. **Cấp quyền Google Drive**: (Mock hiện tại)
6. **Xử lý kết quả**: Format kết quả cấp quyền
7. **Gửi email**: Gửi email thông báo qua Gmail
8. **Merge Email Data**: Kết hợp dữ liệu email với dữ liệu gốc
9. **Format Data**: Format cho PostgreSQL
10. **Lưu Database**: Insert/Update vào `document_sharing`

### Bước 4: Frontend Theo Dõi
1. Frontend bắt đầu polling `/api/document/status/:processingId`
2. Hiển thị trạng thái real-time
3. Khi hoàn thành, hiển thị kết quả

---

## 🐛 Xử Lý Lỗi

### Frontend:
- Validate email format trước khi gửi
- Hiển thị error message nếu request fail
- Retry mechanism cho status polling

### Backend:
- Validate input (processingId, recipient_emails)
- Check document exists trong PostgreSQL
- Handle timeout khi gọi N8N webhook
- Return error message chi tiết

### N8N Workflow:
- Validate processingId và recipient_emails
- Handle email validation errors
- Handle Gmail API errors
- Handle PostgreSQL errors

---

## 📝 Notes & Best Practices

1. **Email Validation**: Luôn validate email format trước khi gửi
2. **Error Handling**: Xử lý lỗi ở mọi bước và log chi tiết
3. **Data Consistency**: Đảm bảo dữ liệu đồng bộ giữa các bảng
4. **Timestamps**: Sử dụng ISO format cho timestamps
5. **SQL Injection**: Escape SQL strings trước khi insert
6. **Array Handling**: Xử lý cả array và string cho recipient_emails
7. **GDPR Compliance**: Luôn kiểm tra GDPR decision trước khi chia sẻ

---

## 🔧 Cấu Hình Environment Variables

```bash
# N8N Webhook URL
N8N_SHARING_WEBHOOK_URL=https://n8n.aidocmanageagent.io.vn/webhook/document-sharing

# PostgreSQL Connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=document_management
DB_USER=postgres
DB_PASSWORD=your_password
```

---

## 📚 Tài Liệu Liên Quan

- [Flow 2 Documentation](./FLOW_2_DOCUMENTATION.md) - GDPR Compliance Workflow
- [Database Schema](./README_SCHEMA.md) - Database schema documentation
- [API Integration](./FLOW_2_3_API_INTEGRATION.md) - API integration guide

---

**Tác giả**: AI Agent Documentation  
**Cập nhật lần cuối**: 2024  
**Version**: 1.0

