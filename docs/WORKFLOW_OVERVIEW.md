# 🔄 LUỒNG HOẠT ĐỘNG 3 FLOWS - Unified Document Management Agent

## 📋 TỔNG QUAN

```
🌐 Frontend (React) → 🔧 Backend (Express) → 🤖 N8N Workflows → 📊 Results
```

## 🚀 LUỒNG CHI TIẾT

### **1️⃣ BƯỚC 1: USER UPLOAD**
```
👤 User → 🌐 Frontend (React)
├── Upload file: PDF, Word, Excel, PowerPoint, Images
├── Input: userId, department, sharingEmails
└── Submit form
```

### **2️⃣ BƯỚC 2: BACKEND PROCESSING**
```
🌐 Frontend → 🔧 Backend (unified-document-agent.js)
├── POST /api/document/process
├── File validation & storage
├── Generate processingId
├── Initialize status tracking
└── Send to N8N workflows
```

### **3️⃣ BƯỚC 3: N8N WORKFLOWS**

#### **🤖 Flow 1 - Document Analysis**
```
📄 Input: File + metadata
├── 🔍 Extract content (PDF, Word, Excel, etc.)
├── 🤖 AI Analysis (Google Gemini)
├── 📊 Generate summary
├── 🏷️ Categorize document
└── 📤 Output: Analysis results
```

#### **⚖️ Flow 3 - GDPR Compliance**
```
📄 Input: Document content
├── 🔍 Scan for personal data
├── 🤖 AI GDPR analysis
├── ⚖️ Make compliance decision
├── 📋 Generate GDPR report
└── 📤 Output: GDPR results
```

#### **📤 Flow 2 - Document Sharing**
```
📄 Input: Analysis + GDPR results
├── 👥 Get employee emails (Google Sheets)
├── 🤖 AI approval decision
├── 📧 Send approval emails (if needed)
├── 🔐 Grant file permissions
├── 📧 Send sharing notifications
└── 📤 Output: Sharing results
```

### **4️⃣ BƯỚC 4: RESULTS INTEGRATION**
```
🤖 N8N Workflows → 🔧 Backend
├── Flow 1 → /webhook/flow1-result
├── Flow 3 → /webhook/flow3-result  
├── Flow 2 → /webhook/flow2-result
└── Update processing status
```

### **5️⃣ BƯỚC 5: FRONTEND DISPLAY**
```
🔧 Backend → 🌐 Frontend
├── Real-time status polling
├── Display analysis results
├── Show GDPR compliance
├── Show sharing status
└── Complete processing
```

## 📊 CHI TIẾT TỪNG FLOW

### **🔍 Flow 1 - Document Analysis**
**Mục đích:** Phân tích nội dung tài liệu

**Input:**
- File upload (PDF, Word, Excel, PowerPoint, Images)
- Metadata (userId, department, sharingEmails)

**Process:**
1. **Extract Content**: Trích xuất nội dung từ file
2. **AI Analysis**: Phân tích bằng Google Gemini
3. **Content Summary**: Tóm tắt nội dung
4. **Categorization**: Phân loại tài liệu
5. **Key Points**: Điểm chính của tài liệu

**Output:**
```json
{
  "analysis": {
    "contentSummary": "Tóm tắt nội dung",
    "keyPoints": ["Điểm 1", "Điểm 2"],
    "category": "HR/Finance/IT",
    "sensitivityLevel": "high/medium/low"
  }
}
```

### **⚖️ Flow 3 - GDPR Compliance**
**Mục đích:** Kiểm tra tuân thủ GDPR

**Input:**
- Document content từ Flow 1
- File metadata

**Process:**
1. **Personal Data Scan**: Quét dữ liệu cá nhân
2. **AI GDPR Analysis**: Phân tích GDPR bằng AI
3. **Compliance Decision**: Quyết định tuân thủ
4. **Risk Assessment**: Đánh giá rủi ro
5. **Recommendations**: Khuyến nghị

**Output:**
```json
{
  "gdpr": {
    "gdprDecision": "delete/anonymize/allow",
    "personalDataFound": ["email", "phone"],
    "sensitiveDataDetected": true,
    "notifyDPO": true,
    "legalBasis": "consent/contract",
    "retentionDays": 30
  }
}
```

### **📤 Flow 2 - Document Sharing**
**Mục đích:** Quản lý chia sẻ tài liệu

**Input:**
- Analysis results từ Flow 1
- GDPR results từ Flow 3
- Sharing parameters

**Process:**
1. **Get Employee Emails**: Lấy danh sách email từ Google Sheets
2. **AI Approval Decision**: Quyết định cần phê duyệt
3. **Send Approval Emails**: Gửi email phê duyệt (nếu cần)
4. **Grant Permissions**: Cấp quyền truy cập file
5. **Send Notifications**: Gửi thông báo chia sẻ

**Output:**
```json
{
  "sharing": {
    "status": "completed",
    "sharedWithEmails": ["email1@company.com"],
    "accessLevel": "reader",
    "expirationDays": 30,
    "permissionsGranted": true,
    "notificationsSent": true
  }
}
```

## 🔄 REAL-TIME STATUS TRACKING

### **Status States:**
```javascript
{
  "status": "processing",
  "steps": {
    "analysis": "completed",    // ✅ Flow 1 done
    "gdpr": "processing",       // 🔄 Flow 3 running  
    "sharing": "pending"        // ⏳ Flow 2 waiting
  },
  "results": {
    "analysis": {...},          // Flow 1 results
    "gdpr": {...},             // Flow 3 results
    "sharing": {...}           // Flow 2 results
  }
}
```

### **Frontend Polling:**
```javascript
// Poll every 2 seconds
setInterval(() => {
  fetch(`/api/document/status/${processingId}`)
    .then(response => response.json())
    .then(status => {
      // Update UI with real-time status
      updateStatusDisplay(status);
    });
}, 2000);
```

## 🎯 KẾT QUẢ CUỐI CÙNG

### **Complete Processing:**
```javascript
{
  "status": "completed",
  "steps": {
    "analysis": "completed",
    "gdpr": "completed", 
    "sharing": "completed"
  },
  "results": {
    "analysis": {
      "contentSummary": "...",
      "keyPoints": [...],
      "category": "HR"
    },
    "gdpr": {
      "gdprDecision": "allow",
      "personalDataFound": ["email"],
      "notifyDPO": false
    },
    "sharing": {
      "status": "completed",
      "sharedWithEmails": ["user@company.com"],
      "permissionsGranted": true
    }
  }
}
```

## 📝 NOTES

- **Backend**: `unified-document-agent.js` - API server chính
- **Frontend**: `frontend/` - React interface
- **Workflows**: `Flow 1.json`, `Flow 2.json`, `Flow 3.json` - N8N automation
- **Test Files**: `test-*.js` - Testing scripts
- **Real-time**: Status polling every 2 seconds
- **Integration**: Webhook-based communication
