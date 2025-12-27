# Sửa lỗi timestamp trong Flow 3

## Lỗi
```
invalid input syntax for type timestamp: ""
```

## Nguyên nhân
Trong SQL query của node "9️⃣ Lưu kết quả chia sẻ vào PostgreSQL", các dòng:
- `'{{ $json.created_at || NOW() }}'::timestamp`
- `'{{ $json.updated_at || NOW() }}'::timestamp`

Khi `created_at` hoặc `updated_at` là empty string `''`, nó sẽ trở thành `''::timestamp` thay vì `NOW()::timestamp` hoặc `CURRENT_TIMESTAMP`.

## Cách sửa

### 1. Node "9️⃣.5️⃣ Format Data cho PostgreSQL" - ĐÃ SỬA ✅
Đã thêm function `formatTimestamp()` và các field:
- `created_at_sql`
- `updated_at_sql`
- `sharing_requested_at_sql`
- `sharing_completed_at_sql`
- `email_sent_at_sql`

### 2. Node "9️⃣ Lưu kết quả chia sẻ vào PostgreSQL" - CẦN SỬA

**Tìm và thay thế trong SQL query:**

**Tìm:**
```sql
'{{ $json.created_at || NOW() }}'::timestamp,
'{{ $json.updated_at || NOW() }}'::timestamp,
{{ $json.sharing_requested_at ? `'${$json.sharing_requested_at}'::timestamp` : 'NULL' }},
{{ $json.sharing_completed_at ? `'${$json.sharing_completed_at}'::timestamp` : 'NOW()::timestamp' }},
```

**Thay bằng:**
```sql
{{ ($json.created_at_sql) || ($json.created_at && $json.created_at !== '' ? `'${$json.created_at}'::timestamp` : 'CURRENT_TIMESTAMP') }},
{{ ($json.updated_at_sql) || ($json.updated_at && $json.updated_at !== '' ? `'${$json.updated_at}'::timestamp` : 'CURRENT_TIMESTAMP') }},
{{ ($json.sharing_requested_at_sql) || ($json.sharing_requested_at && $json.sharing_requested_at !== '' ? `'${$json.sharing_requested_at}'::timestamp` : 'NULL') }},
{{ ($json.sharing_completed_at_sql) || ($json.sharing_completed_at && $json.sharing_completed_at !== '' ? `'${$json.sharing_completed_at}'::timestamp` : 'CURRENT_TIMESTAMP') }},
```

**Và đã sửa:**
```sql
{{ ($json.email_sent_at_sql) || ($json.email_sent_at && $json.email_sent_at !== '' ? `'${$json.email_sent_at}'::timestamp` : 'NULL') }},
```

## Kết quả
- Nếu có `*_sql` field từ node format → dùng field đó
- Nếu không có `*_sql` nhưng có giá trị hợp lệ (không empty) → format timestamp
- Nếu không có hoặc empty → dùng `CURRENT_TIMESTAMP` hoặc `NULL` tùy trường hợp

