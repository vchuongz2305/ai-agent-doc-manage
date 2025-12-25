# Rút Gọn 6 Node AI Thành 1 Node

## 🎯 Mục Tiêu

**Trước:** 6 node Gemini riêng biệt → 6 request → Rate limit ❌
**Sau:** 1 node Gemini tổng hợp → 1 request → Không rate limit ✅

## 📋 Các Node Hiện Tại

1. `main_theme` - Chủ đề chính
2. `document_summary` - Tóm tắt theo section
3. `key_takeaways` - Điểm chính
4. `gaps_and_limitations` - Khoảng trống và hạn chế
5. `follow_up_questions` - Câu hỏi tiếp theo
6. `terminology_to_clarify` - Thuật ngữ cần làm rõ

## ✅ Giải Pháp: Combine Thành 1 Node

### Bước 1: Tạo Node AI Tổng Hợp

**Trong n8n:**

1. **Xóa 6 node AI cũ** (hoặc disable tạm thời)
2. **Thêm 1 node "Google Gemini Chat Model" mới**
3. **Đặt tên:** `comprehensive_analysis`

### Bước 2: Prompt Tổng Hợp

**System Message:**
```
YOU ARE A COMPREHENSIVE DOCUMENT ANALYSIS AGENT. YOU MUST ANALYZE A DOCUMENT AND OUTPUT ALL ANALYSIS RESULTS IN A SINGLE JSON OBJECT.

YOUR TASK:
1. Identify the main theme and purpose
2. Create a section-by-section summary
3. Extract key takeaways
4. Identify gaps and limitations
5. Generate follow-up questions
6. Clarify terminology

OUTPUT FORMAT (MANDATORY JSON):
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

IMPORTANT:
- Return ONLY valid JSON, no markdown code blocks
- All fields are required
- Be specific and accurate
```

**Text Input:**
```
**Document Title:** {{ $('Set File Data').item.json.name }}

**Document Text:** {{ $json.text }}
```

### Bước 3: Structured Output Parser

**JSON Schema:**
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

### Bước 4: Parse Kết Quả (Code Node)

**Thêm Code Node sau AI node để parse và format:**

```javascript
// Parse kết quả từ comprehensive_analysis
const aiResult = $json.output || $json;

// Đảm bảo format giống như 6 node cũ
const parsed = {
  // main_theme format
  main_theme: {
    output: {
      main_theme: aiResult.main_theme || ""
    }
  },
  
  // document_summary format
  document_summary: {
    output: {
      document_summary: aiResult.document_summary || []
    }
  },
  
  // key_takeaways format
  key_takeaways: {
    output: {
      key_takeaways: aiResult.key_takeaways || []
    }
  },
  
  // gaps_and_limitations format
  gaps_and_limitations: {
    output: {
      gaps_and_limitations: aiResult.gaps_and_limitations || []
    }
  },
  
  // follow_up_questions format
  follow_up_questions: {
    output: {
      follow_up_questions: aiResult.follow_up_questions || []
    }
  },
  
  // terminology_to_clarify format
  terminology_to_clarify: {
    output: {
      terminology_to_clarify: aiResult.terminology_to_clarify || []
    }
  }
};

// Return format tương thích với Merge node
return [{
  json: {
    main_theme: parsed.main_theme,
    document_summary: parsed.document_summary,
    key_takeaways: parsed.key_takeaways,
    gaps_and_limitations: parsed.gaps_and_limitations,
    follow_up_questions: parsed.follow_up_questions,
    terminology_to_clarify: parsed.terminology_to_clarify
  }
}];
```

### Bước 5: Update Merge Node

**Merge node cần update để nhận từ 1 node thay vì 6:**

**Trước:**
- Input từ 6 node riêng biệt

**Sau:**
- Input từ 1 Code node (đã parse)

### Bước 6: Update Google Docs Node

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

## 📊 So Sánh

### Trước (6 Node):
```
Extract PDF Text
├──→ main_theme (Gemini) ⚡
├──→ document_summary (Gemini) ⚡
├──→ key_takeaways (Gemini) ⚡
├──→ gaps_and_limitations (Gemini) ⚡
├──→ follow_up_questions (Gemini) ⚡
└──→ terminology_to_clarify (Gemini) ⚡
→ Merge → Aggregate
```
**6 requests → Rate limit!**

### Sau (1 Node):
```
Extract PDF Text
→ comprehensive_analysis (Gemini) ✅
→ Parse Results (Code)
→ Merge → Aggregate
```
**1 request → Không rate limit!**

## ✅ Lợi Ích

1. ✅ **Giảm 83% số request** (6 → 1)
2. ✅ **Không còn rate limit**
3. ✅ **Nhanh hơn** (1 request thay vì 6)
4. ✅ **Rẻ hơn** (ít token hơn)
5. ✅ **Dễ maintain** (1 node thay vì 6)

## 🚨 Lưu Ý

1. **Prompt dài hơn** - Cần đảm bảo không vượt token limit
2. **Response lớn hơn** - Cần parse cẩn thận
3. **Test kỹ** - Đảm bảo output format đúng

## 🧪 Test

Sau khi update:
1. Upload file mới
2. Kiểm tra kết quả trong Google Docs
3. Verify tất cả sections đều có đầy đủ
4. Kiểm tra không còn lỗi 429

