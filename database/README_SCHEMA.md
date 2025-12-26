# Database Schema - Documents Table

## Tổng quan

Bảng `documents` lưu trữ thông tin về các file PDF và kết quả phân tích từ AI.

## Cấu trúc Bảng

### Các cột chính:

| Column | Type | Nullable | Default | Mô tả |
|--------|------|----------|---------|-------|
| `id` | SERIAL | NO | auto | Primary key, tự động tăng |
| `processing_id` | VARCHAR(255) | NO | - | ID duy nhất cho mỗi lần xử lý (UNIQUE) |
| `file_name` | VARCHAR(500) | NO | - | Tên file PDF gốc |
| `file_url` | TEXT | NO | - | URL của file PDF gốc |
| `cloudinary_url` | TEXT | YES | NULL | URL của file PDF trên Cloudinary (dùng để download) |
| `user_id` | VARCHAR(255) | YES | NULL | ID người dùng |
| `department` | VARCHAR(100) | YES | NULL | Phòng ban |
| `status` | VARCHAR(50) | YES | 'pending' | Trạng thái: `pending`, `processing`, `completed`, `failed` |
| `analysis_results` | JSONB | YES | NULL | Kết quả phân tích từ AI (JSON) |
| `docx_url` | TEXT | YES | NULL | URL file DOCX (không còn dùng, giữ lại để tương thích) |
| `created_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Thời gian tạo record |
| `updated_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Thời gian cập nhật cuối (tự động) |
| `analysis_completed_at` | TIMESTAMP | YES | NULL | Thời gian hoàn thành phân tích |

## Cấu trúc analysis_results (JSONB)

Kết quả phân tích được lưu dưới dạng JSON với cấu trúc:

```json
{
  "main_theme": "Three sentences: topic, purpose, audience",
  "document_summary": [
    {
      "section_title": "Section title",
      "content": "Section summary"
    }
  ],
  "key_takeaways": [
    {
      "point": "Key point",
      "context": "Explanation"
    }
  ],
  "gaps_and_limitations": [
    {
      "issue": "Gap description",
      "reason": "Why it matters"
    }
  ],
  "follow_up_questions": [
    "Question 1",
    "Question 2"
  ],
  "terminology_to_clarify": [
    {
      "term": "Term",
      "explanation": "Definition"
    }
  ]
}
```

## Indexes

1. **idx_documents_processing_id**: Index trên `processing_id` (UNIQUE)
2. **idx_documents_user_id**: Index trên `user_id`
3. **idx_documents_status**: Index trên `status`
4. **idx_documents_created_at**: Index trên `created_at`
5. **idx_documents_analysis_completed_at**: Partial index trên `analysis_completed_at` (chỉ các record đã hoàn thành)
6. **idx_documents_analysis_results_gin**: GIN index trên `analysis_results` để query JSON hiệu quả

## Triggers

- **update_documents_updated_at**: Tự động cập nhật `updated_at` khi record được update

## Cách sử dụng

### 1. Chạy script migration

```bash
psql -U your_username -d your_database -f database/update_documents_schema.sql
```

### 2. Kiểm tra schema

```sql
\d documents
```

### 3. Query dữ liệu

```sql
-- Lấy tất cả documents
SELECT * FROM documents ORDER BY created_at DESC;

-- Lấy document theo processing_id
SELECT * FROM documents WHERE processing_id = 'your-processing-id';

-- Query trong analysis_results (sử dụng JSONB operators)
SELECT 
    processing_id,
    file_name,
    analysis_results->>'main_theme' as main_theme,
    analysis_results->'key_takeaways' as key_takeaways
FROM documents
WHERE status = 'completed'
ORDER BY analysis_completed_at DESC;

-- Tìm documents có main_theme chứa từ khóa
SELECT * FROM documents
WHERE analysis_results->>'main_theme' ILIKE '%keyword%';
```

## Workflow Integration

Workflow hiện tại:

1. **Format Data for Postgres**: Format dữ liệu từ Aggregate và Set File Data
2. **Save Analysis to Postgres**: Lưu vào database với:
   - `processing_id`: Từ Set File Data
   - `file_name`: Tên file PDF
   - `file_url`: URL PDF gốc
   - `cloudinary_url`: URL PDF trên Cloudinary (dùng để download)
   - `analysis_results`: Kết quả phân tích từ Aggregate
   - `status`: 'completed'
3. **Get Data from Postgres**: Lấy dữ liệu từ database
4. **Respond to Webhook**: Trả về `file_url` và `analysis_results`

## Lưu ý

- `docx_url` vẫn được giữ lại trong schema nhưng không còn được sử dụng trong workflow mới
- `cloudinary_url` và `file_url` có thể giống nhau nếu file đã được upload lên Cloudinary
- `analysis_results` là JSONB nên có thể query và index hiệu quả
- Tất cả timestamps được tự động cập nhật bởi triggers

