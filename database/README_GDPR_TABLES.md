# Hướng dẫn Setup PostgreSQL Tables cho Flow 2 và Flow 3

## Tổng quan

Flow 2 và Flow 3 sử dụng 2 bảng PostgreSQL để lưu trữ dữ liệu:
- **gdpr_compliance_results**: Lưu kết quả phân tích GDPR từ Flow 2
- **document_sharing**: Lưu thông tin chia sẻ tài liệu từ Flow 3

## Bước 1: Tạo Database và Tables

### 1.1. Kết nối PostgreSQL

```bash
psql -U your_username -d your_database
```

### 1.2. Chạy SQL Script

```bash
psql -U your_username -d your_database -f database/create_gdpr_tables.sql
```

Hoặc copy và chạy trực tiếp trong psql:

```sql
\i database/create_gdpr_tables.sql
```

## Bước 2: Cấu hình PostgreSQL Credentials trong N8N

### 2.1. Tạo Postgres Credential (nếu chưa có)

1. Mở N8N: https://n8n.aidocmanageagent.io.vn
2. Vào **Settings** → **Credentials**
3. Click **Add Credential** → Chọn **Postgres**
4. Điền thông tin:
   - **Host**: localhost hoặc IP của Postgres server
   - **Database**: Tên database (ví dụ: `document_management`)
   - **User**: Username
   - **Password**: Password
   - **Port**: 5432 (mặc định)
   - **SSL**: Tùy chọn (Enable nếu cần)

### 2.2. Gán Credential cho Nodes trong Flow 2

1. Mở workflow **"Flow 2"** (hoặc workflow của bạn)
2. Click vào node **"1️⃣1️⃣ Lưu kết quả GDPR vào PostgreSQL"**
3. Trong phần **Credential**, chọn credential Postgres vừa tạo
4. Làm tương tự cho node **"🔍 Query GDPR từ PostgreSQL"**

## Bước 3: Cấu trúc Tables

### 3.1. Bảng `gdpr_compliance_results` (Flow 2)

Lưu kết quả phân tích GDPR compliance:

- **processing_id** (VARCHAR, UNIQUE, NOT NULL): ID duy nhất của file
- **audit_id** (VARCHAR): ID audit trail
- **file_name**, **file_url**, **cloudinary_url**: Thông tin file
- **user_id**, **department**, **uploader**: Thông tin người dùng
- **analysis_results** (JSONB): Kết quả phân tích từ Flow 1
- **gdpr_decision**: Quyết định GDPR ('delete', 'anonymize', 'allow')
- **gdpr_justification**: Lý do quyết định
- **legal_basis**: Cơ sở pháp lý
- **retention_days**: Số ngày lưu trữ
- **redaction_fields** (TEXT[]): Các trường cần redact
- **personal_data_found** (TEXT[]): Dữ liệu cá nhân tìm thấy
- **sensitive_data_detected** (BOOLEAN): Có dữ liệu nhạy cảm không
- **data_volume**: Khối lượng dữ liệu ('high', 'medium', 'low')
- **notify_dpo** (BOOLEAN): Cần thông báo DPO không
- **status**: Trạng thái ('gdpr_completed', etc.)
- **gdpr_action_performed**: Hành động đã thực hiện
- **timestamps**: created_at, updated_at, ai_decision_timestamp, gdpr_completed_at

### 3.2. Bảng `document_sharing` (Flow 3)

Lưu thông tin chia sẻ tài liệu:

- **processing_id** (VARCHAR, NOT NULL): ID của file
- **sharing_id** (VARCHAR, UNIQUE): ID duy nhất cho mỗi lần chia sẻ
- **file_name**, **file_url**, **cloudinary_url**, **docx_url**: Thông tin file
- **user_id**, **department**: Thông tin người dùng
- **recipient_emails** (TEXT[]): Danh sách email người nhận
- **recipient_names** (TEXT[]): Tên người nhận (optional)
- **sharing_method**: Phương thức chia sẻ ('email', 'link', 'drive')
- **share_link**: Link chia sẻ (nếu chia sẻ qua link)
- **access_level**: Mức độ truy cập ('viewer', 'commenter', 'editor')
- **gdpr_decision**: Quyết định GDPR từ Flow 2
- **gdpr_approved** (BOOLEAN): Đã được frontend approve để chia sẻ
- **legal_basis**: Cơ sở pháp lý
- **retention_days**: Số ngày lưu trữ
- **status**: Trạng thái ('pending', 'sent', 'failed', 'cancelled')
- **sharing_status**: Trạng thái chia sẻ ('queued', 'processing', 'completed', 'failed')
- **email_sent** (BOOLEAN): Đã gửi email chưa
- **email_sent_at**: Thời điểm gửi email
- **email_subject**, **email_body**: Nội dung email
- **timestamps**: created_at, updated_at, sharing_requested_at, sharing_completed_at
- **workflow_source**: Nguồn workflow ('flow3-document-sharing')
- **flow3_completed** (BOOLEAN): Flow 3 đã hoàn thành chưa
- **notes**: Ghi chú bổ sung

## Bước 4: Test Kết Nối

### 4.1. Test Từ Command Line

```bash
# Test kết nối
psql -U doc_user -d document_management -h localhost -c "SELECT version();"

# Test insert dữ liệu mẫu vào gdpr_compliance_results
psql -U doc_user -d document_management -h localhost << EOF
INSERT INTO gdpr_compliance_results (
    processing_id, 
    file_name, 
    gdpr_decision,
    status
) VALUES (
    'test-gdpr-001',
    'test.pdf',
    'allow',
    'gdpr_completed'
) ON CONFLICT (processing_id) DO NOTHING;
SELECT * FROM gdpr_compliance_results WHERE processing_id = 'test-gdpr-001';
EOF

# Test insert dữ liệu mẫu vào document_sharing
psql -U doc_user -d document_management -h localhost << EOF
INSERT INTO document_sharing (
    processing_id,
    sharing_id,
    file_name,
    recipient_emails,
    status
) VALUES (
    'test-gdpr-001',
    'share-001',
    'test.pdf',
    ARRAY['test@example.com'],
    'pending'
) ON CONFLICT (sharing_id) DO NOTHING;
SELECT * FROM document_sharing WHERE sharing_id = 'share-001';
EOF
```

### 4.2. Test Từ N8N

1. **Test Node "Lưu kết quả GDPR vào PostgreSQL"**
   - Chạy workflow Flow 2 với dữ liệu test
   - Kiểm tra xem dữ liệu đã được lưu vào bảng `gdpr_compliance_results` chưa

2. **Test Node "Query GDPR từ PostgreSQL"**
   - Gọi endpoint GET `/gdpr?processingId=test-gdpr-001`
   - Kiểm tra xem có trả về kết quả đúng không

## Bước 5: Sử dụng trong Frontend

### 5.1. Query kết quả GDPR

Frontend có thể query kết quả GDPR qua endpoint:

```
GET http://localhost:3000/gdpr?processingId=xxx
```

Response:
```json
{
  "success": true,
  "data": {
    "processing_id": "xxx",
    "gdpr_decision": "allow",
    "gdpr_justification": "...",
    "legal_basis": "consent",
    ...
  }
}
```

### 5.2. Quyết định gửi tới Flow 3

Sau khi nhận kết quả GDPR, frontend sẽ:
1. Hiển thị kết quả cho user
2. User quyết định có gửi tới Flow 3 hay không
3. Nếu đồng ý, frontend gọi endpoint Flow 3 với dữ liệu đầy đủ

## Lưu ý

- Đảm bảo PostgreSQL credential trong N8N đã được cấu hình đúng
- Kiểm tra indexes đã được tạo để tối ưu query performance
- Arrays trong PostgreSQL cần format đúng (đã được xử lý trong Code node)
- JSONB fields (analysis_results) cần escape quotes đúng cách

