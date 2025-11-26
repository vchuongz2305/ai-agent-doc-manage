# 🔄 TỔNG QUAN 3 FLOWS - Unified Document Management Agent

## 📋 **TỔNG QUAN HỆ THỐNG**

### **🎯 MỤC ĐÍCH CHÍNH:**
Tự động hóa quy trình quản lý tài liệu từ upload → phân tích → kiểm tra GDPR → chia sẻ với AI-powered decision making.

### **🏗️ KIẾN TRÚC:**
```
🌐 Frontend (React) → 🔧 Backend (Express) → 🤖 N8N Workflows → 📊 Results
```

---

## 🔍 **FLOW 1 - DOCUMENT ANALYSIS**

### **🎯 MỤC ĐÍCH:**
Phân tích nội dung tài liệu bằng AI để hiểu và phân loại tài liệu.

### **📥 INPUT:**
- File upload (PDF, Word, Excel, PowerPoint, Images)
- Metadata (userId, department, sharingEmails)
- Processing ID

### **⚙️ QUY TRÌNH:**
1. **Webhook Trigger** - Nhận request từ backend
2. **Extract PDF Text** - Trích xuất nội dung từ file
3. **AI Analysis** - Phân tích bằng Google Gemini
4. **Content Summary** - Tóm tắt nội dung
5. **Categorization** - Phân loại tài liệu
6. **Key Points** - Điểm chính của tài liệu

### **📤 OUTPUT:**
```json
{
  "analysis": {
    "contentSummary": "Tóm tắt nội dung tài liệu",
    "keyPoints": ["Điểm 1", "Điểm 2", "Điểm 3"],
    "category": "HR/Finance/IT/General",
    "sensitivityLevel": "high/medium/low",
    "documentTitle": "Tên tài liệu",
    "sections": [
      {
        "section_title": "Tiêu đề phần",
        "content": "Nội dung phần"
      }
    ]
  }
}
```

### **🔧 CÔNG NGHỆ:**
- **Google Gemini AI** - Phân tích nội dung
- **PDF Text Extraction** - Trích xuất văn bản
- **Structured Output Parser** - Định dạng kết quả

---

## ⚖️ **FLOW 3 - GDPR COMPLIANCE**

### **🎯 MỤC ĐÍCH:**
Kiểm tra tuân thủ GDPR cho tài liệu và quyết định hành động phù hợp.

### **📥 INPUT:**
- Document content từ Flow 1
- File metadata
- Analysis results

### **⚙️ QUY TRÌNH:**
1. **Webhook Trigger** - Nhận request từ backend
2. **Chuẩn hóa dữ liệu đầu vào** - Xử lý dữ liệu
3. **AI GDPR Decision** - AI quyết định hành động GDPR
4. **Parse quyết định GDPR** - Phân tích quyết định
5. **Hành động: Delete?** - Kiểm tra cần xóa không
6. **Hành động: Anonymize?** - Kiểm tra cần ẩn danh không
7. **Thực thi hành động** - Thực hiện quyết định
8. **Thông báo DPO** - Gửi thông báo nếu cần

### **📤 OUTPUT:**
```json
{
  "gdpr": {
    "gdprDecision": "delete/anonymize/allow",
    "personalDataFound": ["email", "phone", "address"],
    "sensitiveDataDetected": true,
    "notifyDPO": true,
    "legalBasis": "consent/contract/legitimate_interest",
    "retentionDays": 30,
    "riskLevel": "high/medium/low",
    "complianceStatus": "compliant/non_compliant",
    "recommendations": ["Khuyến nghị 1", "Khuyến nghị 2"]
  }
}
```

### **🔧 CÔNG NGHỆ:**
- **Google Gemini AI** - Phân tích GDPR
- **If/Else Logic** - Phân nhánh quyết định
- **Merge Nodes** - Hợp nhất kết quả
- **Email Integration** - Gửi thông báo

---

## 📤 **FLOW 2 - DOCUMENT SHARING**

### **🎯 MỤC ĐÍCH:**
Quản lý chia sẻ tài liệu với AI-powered approval và Google Drive integration.

### **📥 INPUT:**
- Analysis results từ Flow 1
- GDPR results từ Flow 3
- Sharing parameters (emails, department)
- Google Drive file data

### **⚙️ QUY TRÌNH:**
1. **Webhook Trigger** - Nhận request từ backend
2. **Xử lý dữ liệu đầu vào** - Chuẩn hóa dữ liệu
3. **Cần phê duyệt?** - AI quyết định cần approval
4. **Gửi email phê duyệt** - Nếu cần approval
5. **Cấp quyền truy cập** - Grant permissions trên Google Drive
6. **Gửi thông báo chia sẻ** - Notify recipients
7. **Log kết quả** - Ghi lại audit trail

### **📤 OUTPUT:**
```json
{
  "sharing": {
    "status": "completed/pending/failed",
    "sharedWithEmails": ["email1@company.com", "email2@company.com"],
    "accessLevel": "reader/commenter/editor",
    "expirationDays": 30,
    "permissionsGranted": true,
    "notificationsSent": true,
    "approvalRequired": false,
    "approvalStatus": "approved/pending/rejected",
    "googleDriveLink": "https://drive.google.com/file/d/...",
    "auditTrail": {
      "sharedBy": "user@company.com",
      "sharedAt": "2024-01-01T00:00:00Z",
      "expiresAt": "2024-01-31T00:00:00Z"
    }
  }
}
```

### **🔧 CÔNG NGHỆ:**
- **Google Drive API** - Quản lý file và permissions
- **Google Sheets API** - Lấy danh sách employees
- **Gmail API** - Gửi email notifications
- **AI Decision Making** - Quyết định approval

---

## 🔄 **LUỒNG HOẠT ĐỘNG TỔNG THỂ**

### **1️⃣ BƯỚC 1: USER UPLOAD**
```
👤 User → 🌐 Frontend (React)
├── Upload file: PDF, Word, Excel, PowerPoint, Images
├── Chọn bộ phận: IT, HR, Finance
├── Chọn người dùng: Từ dropdown theo bộ phận
├── Input: userId, department, sharingEmails (tự động)
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

### **3️⃣ BƯỚC 3: N8N WORKFLOWS (SONG SONG)**

#### **🔍 Flow 1 - Document Analysis:**
```
📄 Input: File + metadata
├── 🔍 Extract content (PDF, Word, Excel, etc.)
├── 🤖 AI Analysis (Google Gemini)
├── 📊 Generate summary
├── 🏷️ Categorize document
└── 📤 Output: Analysis results
```

#### **⚖️ Flow 3 - GDPR Compliance:**
```
📄 Input: Document content
├── 🔍 Scan for personal data
├── 🤖 AI GDPR analysis
├── ⚖️ Make compliance decision
├── 📋 Generate GDPR report
└── 📤 Output: GDPR results
```

#### **📤 Flow 2 - Document Sharing:**
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

---

## 📊 **REAL-TIME STATUS TRACKING**

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

---

## 🎯 **KẾT QUẢ CUỐI CÙNG**

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
      "contentSummary": "Tóm tắt tài liệu về chính sách công ty",
      "keyPoints": ["Điểm 1", "Điểm 2"],
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

---

## 🔧 **TECHNICAL STACK**

### **Frontend:**
- **React + Vite** - UI framework
- **CSS3** - Styling với responsive design
- **JavaScript ES6+** - Logic và state management

### **Backend:**
- **Node.js + Express** - API server
- **Multer** - File upload handling
- **Axios** - HTTP client cho N8N calls

### **N8N Workflows:**
- **Google Gemini AI** - Content analysis
- **Google Drive API** - File management
- **Google Sheets API** - Employee data
- **Gmail API** - Email notifications
- **Webhook triggers** - API integration

### **Database:**
- **In-memory Map** - Processing status tracking
- **File system** - Uploaded files storage

---

## 🚀 **BENEFITS**

### **✅ Automation:**
1. **Tự động phân tích** tài liệu bằng AI
2. **Tự động kiểm tra GDPR** compliance
3. **Tự động chia sẻ** với approval workflow
4. **Real-time tracking** của toàn bộ quy trình

### **🎯 User Experience:**
- **Drag & drop upload** - Dễ sử dụng
- **Multi-department selection** - Linh hoạt
- **Real-time status** - Minh bạch
- **Responsive design** - Mọi thiết bị

### **🔒 Security & Compliance:**
- **GDPR compliance** - Tự động kiểm tra
- **AI-powered decisions** - Thông minh
- **Audit trail** - Theo dõi đầy đủ
- **Permission management** - Bảo mật

---

## 📝 **USE CASES**

### **HR Department:**
- Upload policy documents
- Auto-analyze content
- GDPR compliance check
- Share with employees

### **IT Department:**
- Upload technical specs
- Auto-categorize documents
- Security assessment
- Share with team members

### **Finance Department:**
- Upload financial reports
- Content analysis
- Compliance verification
- Controlled sharing

---

## 🎉 **KẾT LUẬN**

Hệ thống **Unified Document Management Agent** cung cấp:

- **🤖 AI-powered analysis** - Thông minh và chính xác
- **⚖️ GDPR compliance** - Tuân thủ quy định
- **📤 Smart sharing** - Chia sẻ thông minh
- **🔄 Real-time tracking** - Theo dõi minh bạch
- **📱 Responsive UI** - Giao diện thân thiện
- **🔒 Security** - Bảo mật cao

**Tất cả được tích hợp trong một hệ thống thống nhất, tự động hóa toàn bộ quy trình quản lý tài liệu từ upload đến chia sẻ!**
