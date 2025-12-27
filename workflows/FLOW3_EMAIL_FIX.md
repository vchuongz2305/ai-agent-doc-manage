# Hướng dẫn sửa Flow 3 để email lấy dữ liệu từ database

## Vấn đề
Email chia sẻ file hiện tại không lấy dữ liệu từ bảng `gdpr_compliance_results` trong database, nên thiếu thông tin GDPR chi tiết.

## Giải pháp

### Bước 1: Thêm node Query GDPR từ PostgreSQL

Thêm node mới **TRƯỚC** node "8️⃣ Gửi thông báo chia sẻ":

**Node Type:** PostgreSQL (Execute Query)
**Node Name:** "🔍 Query GDPR từ Database"
**Position:** Giữa node "🔐 Cấp quyền Google Drive" và "8️⃣ Gửi thông báo chia sẻ"

**Query:**
```sql
SELECT 
  id,
  processing_id,
  audit_id,
  file_name,
  file_url,
  cloudinary_url,
  user_id,
  department,
  uploader,
  analysis_results,
  gdpr_decision,
  gdpr_justification,
  legal_basis,
  retention_days,
  redaction_fields,
  personal_data_found,
  sensitive_data_detected,
  data_volume,
  notify_dpo,
  status,
  gdpr_action_performed,
  ai_decision_timestamp,
  gdpr_completed_at,
  workflow_source,
  flow2_completed
FROM gdpr_compliance_results 
WHERE processing_id = '{{ $json.processing_id }}' 
ORDER BY created_at DESC 
LIMIT 1;
```

### Bước 2: Thêm node Merge GDPR Data

Thêm node Code để merge dữ liệu GDPR từ database:

**Node Type:** Code
**Node Name:** "📋 Merge GDPR Data cho Email"

**Code:**
```javascript
// 📋 Merge dữ liệu GDPR từ database với dữ liệu chia sẻ
const gdprData = $json || {};
const originalData = $input.first().json || {};

console.log('=== 📋 MERGE GDPR DATA ===');
console.log('GDPR Data from DB:', gdprData);
console.log('Original Data:', originalData);

// Format dữ liệu personal_data_found
let personalDataFound = [];
if (gdprData.personal_data_found) {
  if (Array.isArray(gdprData.personal_data_found)) {
    personalDataFound = gdprData.personal_data_found;
  } else if (typeof gdprData.personal_data_found === 'string') {
    try {
      personalDataFound = JSON.parse(gdprData.personal_data_found);
    } catch (e) {
      personalDataFound = [gdprData.personal_data_found];
    }
  }
}

// Format dữ liệu redaction_fields
let redactionFields = [];
if (gdprData.redaction_fields) {
  if (Array.isArray(gdprData.redaction_fields)) {
    redactionFields = gdprData.redaction_fields;
  } else if (typeof gdprData.redaction_fields === 'string') {
    try {
      redactionFields = JSON.parse(gdprData.redaction_fields);
    } catch (e) {
      redactionFields = [gdprData.redaction_fields];
    }
  }
}

// Format personal data found cho email
let personalDataFoundText = 'Không có';
if (personalDataFound && personalDataFound.length > 0) {
  personalDataFoundText = personalDataFound.map(item => {
    if (typeof item === 'string') return item;
    return JSON.stringify(item);
  }).join(', ');
}

// Format redaction fields cho email
let redactionFieldsText = 'Không có';
if (redactionFields && redactionFields.length > 0) {
  redactionFieldsText = redactionFields.join(', ');
}

// Merge tất cả dữ liệu
const mergedData = {
  // Giữ nguyên dữ liệu gốc
  ...originalData,
  
  // Dữ liệu GDPR từ database (ưu tiên)
  gdpr_decision: gdprData.gdpr_decision || originalData.gdpr_decision || null,
  gdpr_justification: gdprData.gdpr_justification || originalData.gdpr_justification || null,
  legal_basis: gdprData.legal_basis || originalData.legal_basis || null,
  retention_days: gdprData.retention_days || originalData.retention_days || 30,
  sensitive_data_detected: gdprData.sensitive_data_detected !== undefined ? gdprData.sensitive_data_detected : (originalData.sensitive_data_detected !== undefined ? originalData.sensitive_data_detected : false),
  data_volume: gdprData.data_volume || originalData.data_volume || 'Không xác định',
  notify_dpo: gdprData.notify_dpo !== undefined ? gdprData.notify_dpo : (originalData.notify_dpo !== undefined ? originalData.notify_dpo : false),
  ai_decision_timestamp: gdprData.ai_decision_timestamp || gdprData.gdpr_completed_at || originalData.ai_decision_timestamp || new Date().toISOString(),
  
  // Format arrays
  personal_data_found: personalDataFound,
  personal_data_found_text: personalDataFoundText,
  redaction_fields: redactionFields,
  redaction_fields_text: redactionFieldsText,
  
  // Thông tin file (ưu tiên từ database)
  file_name: gdprData.file_name || originalData.file_name || 'Không xác định',
  file_url: gdprData.file_url || gdprData.cloudinary_url || originalData.file_url || originalData.cloudinary_url || 'Không có URL',
  processing_id: gdprData.processing_id || originalData.processing_id || 'Không có',
  
  // Email recipients
  recipient_emails: originalData.recipient_emails || originalData.shareWithEmails || [],
  shareWithEmails: originalData.shareWithEmails || originalData.recipient_emails || []
};

console.log('✅ Merged data for email:');
console.log('   File Name:', mergedData.file_name);
console.log('   Processing ID:', mergedData.processing_id);
console.log('   GDPR Decision:', mergedData.gdpr_decision);
console.log('   Personal Data Found:', mergedData.personal_data_found_text);
console.log('   Redaction Fields:', mergedData.redaction_fields_text);
console.log('=== END 📋 MERGE GDPR DATA ===');

return [{ json: mergedData }];
```

### Bước 3: Sửa node Email "8️⃣ Gửi thông báo chia sẻ"

**Subject:**
```
Kết quả kiểm tra GDPR và chia sẻ tài liệu: {{ $json.file_name }}
```

**Message:**
```
Kính chào bạn,

Hệ thống AI GDPR Compliance Agent đã hoàn tất việc kiểm tra tuân thủ GDPR cho tài liệu của bạn.

**Thông tin tài liệu:**

- Tên file: {{ $json.file_name || 'Không xác định' }}
- Processing ID: {{ $json.processing_id || 'Không có' }}
- URL file: {{ $json.file_url || 'Không có URL' }}

**🔍 Kết quả phân tích nội dung:**

- Dữ liệu cá nhân tìm thấy: {{ $json.personal_data_found_text || 'Không có' }}
- Dữ liệu nhạy cảm: {{ $json.sensitive_data_detected ? 'Có' : 'Không' }}
- Khối lượng dữ liệu: {{ $json.data_volume || 'Không xác định' }}

**Kết quả quyết định GDPR:**

- Quyết định xử lý: **{{ $json.gdpr_decision || 'Không xác định' }}**
- Thông báo DPO: {{ $json.notify_dpo ? 'Có' : 'Không' }}
- Cơ sở pháp lý: {{ $json.legal_basis || 'Không có' }}
- Thời gian lưu trữ: {{ $json.retention_days || 30 }} ngày
- Các trường cần redact: {{ $json.redaction_fields_text || 'Không có' }}

**Lý do quyết định:**

{{ $json.gdpr_justification || 'Không có lý do được cung cấp.' }}

**Thời điểm ra quyết định:** {{ $json.ai_decision_timestamp || (new Date()).toISOString() }}

Nếu bạn có bất kỳ thắc mắc nào về kết quả này, vui lòng liên hệ với bộ phận bảo mật dữ liệu (DPO) để được hỗ trợ.

Trân trọng,

**AI GDPR Compliance Agent**
```

## Kết nối các nodes

1. "🔐 Cấp quyền Google Drive" → "🔍 Query GDPR từ Database"
2. "🔍 Query GDPR từ Database" → "📋 Merge GDPR Data cho Email"
3. "📋 Merge GDPR Data cho Email" → "8️⃣ Gửi thông báo chia sẻ"

## Lưu ý

- Đảm bảo PostgreSQL credentials đã được cấu hình đúng trong n8n
- Node query sẽ lấy dữ liệu mới nhất từ database dựa trên `processing_id`
- Nếu không tìm thấy dữ liệu trong database, sẽ dùng dữ liệu từ Flow 2 (fallback)

