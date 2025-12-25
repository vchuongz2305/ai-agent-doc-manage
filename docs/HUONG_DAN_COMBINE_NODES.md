# Hướng Dẫn Chi Tiết: Combine 6 Node AI Thành 1 Node

## 🎯 Mục Đích

Thay vì gọi 6 node Gemini riêng biệt (gây rate limit), chỉ cần **1 node Gemini** với prompt tổng hợp.

## 📋 Các Bước Thực Hiện

### Bước 1: Backup Workflow

1. Mở workflow "Test 2" (Flow 1) trong n8n
2. Click **"Save as"** → Lưu backup: "Flow 1 - Backup"
3. Hoặc export workflow JSON để backup

### Bước 2: Disable/Xóa 6 Node AI Cũ

**Các node cần disable/xóa:**
1. `main_theme` (Google Gemini Chat Model)
2. `document_summary` (Agent)
3. `key_takeaways` (Agent)
4. `gaps_and_limitations` (Agent)
5. `follow_up_questions` (Agent)
6. `terminology_to_clarify` (Agent)

**Cách làm:**
- **Option 1:** Disable tạm thời (không xóa) để test
- **Option 2:** Xóa hẳn (nếu chắc chắn)

### Bước 3: Tạo Node AI Tổng Hợp

1. **Thêm node mới:**
   - Click **"+"** sau node "Extract PDF Text"
   - Tìm và chọn **"Google Gemini Chat Model"**
   - Đặt tên: `comprehensive_analysis`

2. **Kết nối:**
   - `Extract PDF Text` → `comprehensive_analysis`

3. **Cấu hình node:**
   - **Credential:** "Google Gemini(PaLM) Api account 2"
   - **Model:** `models/gemini-2.5-flash`

4. **Thêm System Message:**
   - Copy prompt từ file `Flow 1 - Combined AI Prompt.txt`
   - Paste vào **System Message** field

5. **Thêm Text Input:**
   ```
   **Document Title:** {{ $('Set File Data').item.json.name }}
   
   **Document Text:** {{ $json.text }}
   ```

### Bước 4: Thêm Structured Output Parser

1. **Thêm node "Structured Output Parser"** sau `comprehensive_analysis`
2. **JSON Schema:**
   ```json
   {
     "main_theme": "string",
     "document_summary": [
       {
         "section_title": "string",
         "content": "string"
       }
     ],
     "key_takeaways": [
       {
         "point": "string",
         "context": "string"
       }
     ],
     "gaps_and_limitations": [
       {
         "issue": "string",
         "reason": "string"
       }
     ],
     "follow_up_questions": ["string"],
     "terminology_to_clarify": [
       {
         "term": "string",
         "explanation": "string"
       }
     ]
   }
   ```

### Bước 5: Thêm Code Node Parse

1. **Thêm node "Code"** sau Structured Output Parser
2. **Đặt tên:** `Parse Combined Result`
3. **Copy code từ file:** `parse-combined-ai-result.js`
4. **Paste vào Code node**

### Bước 6: Update Merge Node

1. **Tìm node "Merge"**
2. **Update số inputs:**
   - **Trước:** 7 inputs (6 AI nodes + 1 khác)
   - **Sau:** 1 input (từ Parse node)

3. **Hoặc xóa Merge node** và dùng trực tiếp từ Parse node

### Bước 7: Update Google Docs Node

**Google Docs node vẫn dùng format cũ:**

```javascript
={{ $json.name }}

{{ $json.main_theme.output.main_theme }}

{{ $json.document_summary.output.document_summary.map(section => `📌 ${section.section_title}:\n${section.content}`).join('\n\n') }}

--- Key Takeaways ---
{{ $json.key_takeaways.output.key_takeaways.map(takeaway => `- ${takeaway.point}:\n${takeaway.context}`).join('\n\n') }}

--- Gaps & Limitations ---
{{ $json.gaps_and_limitations.output.gaps_and_limitations.map(gap => `- ${gap.issue}:\n${gap.reason}`).join('\n\n') }}

--- Follow-Up Questions ---
{{ $json.follow_up_questions.output.follow_up_questions.map(question => `?? ${question}`).join('\n\n') }}

--- Terminology To Clarify ---
{{ $json.terminology_to_clarify.output.terminology_to_clarify.map(entry => `- ${entry.term}:\n${entry.explanation}`).join('\n\n') }}
```

### Bước 8: Test Workflow

1. **Lưu workflow**
2. **Execute workflow** với file test
3. **Kiểm tra:**
   - ✅ Không còn lỗi 429
   - ✅ Kết quả đầy đủ trong Google Docs
   - ✅ Tất cả sections có data

## 📊 Workflow Mới

```
Extract PDF Text
→ comprehensive_analysis (Google Gemini) ✅
→ Structured Output Parser
→ Parse Combined Result (Code)
→ Merge (hoặc bỏ qua)
→ Aggregate
→ Save Analysis to Postgres
→ Google Docs
```

## ✅ Kết Quả

- ✅ **Giảm 83% số request** (6 → 1)
- ✅ **Không còn rate limit**
- ✅ **Nhanh hơn** (1 request thay vì 6)
- ✅ **Rẻ hơn** (ít token hơn)
- ✅ **Dễ maintain** (1 node thay vì 6)

## 🚨 Troubleshooting

### Nếu AI trả về format sai:

1. **Kiểm tra System Message** - Đảm bảo yêu cầu JSON rõ ràng
2. **Kiểm tra Parse Code** - Có thể cần adjust parsing logic
3. **Test với file nhỏ** - Để debug dễ hơn

### Nếu thiếu data:

1. **Kiểm tra prompt** - Đảm bảo yêu cầu đầy đủ
2. **Kiểm tra Parse Code** - Có thể thiếu field nào đó
3. **Add logging** - Console.log để debug

## 💡 Tips

1. **Test từng bước** - Không làm hết một lúc
2. **Backup thường xuyên** - Trước mỗi thay đổi lớn
3. **Monitor token usage** - Prompt dài hơn có thể tốn nhiều token
4. **Optimize prompt** - Có thể rút gọn một số phần

