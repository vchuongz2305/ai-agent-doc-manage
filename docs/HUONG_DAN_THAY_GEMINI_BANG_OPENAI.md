# Hướng Dẫn Thay Google Gemini Bằng OpenAI GPT

## 🎯 Mục Đích

Khi Google Gemini bị rate limit (429), thay thế bằng OpenAI GPT để workflow tiếp tục hoạt động.

## 📋 Các Bước Thực Hiện

### Bước 1: Tạo OpenAI API Key

1. Vào: https://platform.openai.com/api-keys
2. Đăng nhập hoặc tạo tài khoản OpenAI
3. Click **"Create new secret key"**
4. Copy API key (chỉ hiện 1 lần, lưu lại!)

### Bước 2: Thêm OpenAI Credential Trong n8n

1. Đăng nhập n8n: `https://n8n.aidocmanageagent.io.vn`
2. Vào **Settings** → **Credentials**
3. Click **"Add Credential"**
4. Tìm và chọn **"OpenAI API"**
5. Nhập:
   - **API Key:** Paste API key từ bước 1
   - **Organization ID:** (Optional, để trống nếu không có)
6. Click **"Save"**
7. Đặt tên: "OpenAI API" hoặc "OpenAI GPT"

### Bước 3: Thay Node Trong Workflow

**Option A: Thay Trực Tiếp (Khuyến nghị)**

1. Mở workflow "Test 2" (Flow 1)
2. Tìm node **"comprehensive_analysis"** (Google Gemini)
3. Click vào node → Vào tab **"Settings"** (⚙️)
4. Hoặc **Delete node cũ** và **Add node mới**:
   - Click **"+"** sau node "Extract PDF Text"
   - Tìm và chọn **"AI Agent"** (`@n8n/n8n-nodes-langchain.agent`)
   - Đặt tên: `comprehensive_analysis`

5. **Thêm Language Model:**
   - Click **"+"** trong node
   - Chọn **"OpenAI Chat Model"** (`@n8n/n8n-nodes-langchain.lmChatOpenAi`)
   - **Credential:** Chọn "OpenAI API" (từ bước 2)
   - **Model:** Chọn `gpt-4-turbo-preview` hoặc `gpt-3.5-turbo`
   - **Temperature:** `0.7`
   - **Max Tokens:** `4000`

6. **Giữ nguyên System Message và Text Input:**
   - System Message: Copy từ workflow cũ
   - Text Input: `**Document Title:** {{ $('Set File Data').item.json.name }}\n\n**Document Text:** {{ $json.text }}`

7. **Thêm Structured Output Parser:**
   - Thêm node **"Structured Output Parser"** sau node AI
   - JSON Schema: Copy từ workflow cũ

**Option B: Import Workflow Mới**

1. Vào n8n → **Workflows** → **Import**
2. Import file: `workflows/Flow 1 - With OpenAI GPT.json`
3. **Cập nhật credential:**
   - Click vào node "OpenAI Chat Model"
   - Chọn credential "OpenAI API" (từ bước 2)
4. **Test workflow**

### Bước 4: Test Workflow

1. Click **"Save"** để lưu workflow
2. Click **"Execute Workflow"** để test
3. Upload file PDF từ frontend
4. Kiểm tra kết quả:
   - ✅ Không còn lỗi 429
   - ✅ AI phân tích thành công
   - ✅ Kết quả giống như dùng Gemini

## 🔧 Cấu Hình Chi Tiết

### OpenAI Chat Model Settings

```json
{
  "model": "gpt-4-turbo-preview",
  "options": {
    "temperature": 0.7,
    "maxTokens": 4000
  }
}
```

**Models khuyến nghị:**
- `gpt-4-turbo-preview` - Chất lượng cao nhất
- `gpt-3.5-turbo` - Rẻ hơn, vẫn tốt
- `gpt-4` - Chất lượng cao, đắt hơn

### System Message (Giữ Nguyên)

```
YOU ARE A COMPREHENSIVE DOCUMENT ANALYSIS AGENT...
```

### Text Input (Giữ Nguyên)

```
**Document Title:** {{ $('Set File Data').item.json.name }}

**Document Text:** {{ $json.text }}
```

## 💰 Chi Phí

### GPT-4 Turbo
- **Input:** $0.01/1K tokens
- **Output:** $0.03/1K tokens
- **Ví dụ:** 1 file PDF ~1000 tokens → ~$0.04

### GPT-3.5 Turbo (Rẻ hơn)
- **Input:** $0.0005/1K tokens
- **Output:** $0.0015/1K tokens
- **Ví dụ:** 1 file PDF ~1000 tokens → ~$0.002

## 📊 So Sánh

| Feature | Gemini | GPT-4 Turbo | GPT-3.5 Turbo |
|---------|--------|-------------|---------------|
| Rate Limit | ⚠️ Thấp | ✅ Cao | ✅ Cao |
| Tốc Độ | ⚡ Nhanh | ⚡ Nhanh | ⚡⚡ Rất nhanh |
| Chi Phí | 💰 Rẻ | 💰💰 Trung bình | 💰 Rẻ |
| Chất Lượng | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

## ✅ Kết Quả

Sau khi thay thế:
- ✅ Không còn lỗi 429 rate limit
- ✅ Workflow hoạt động ổn định
- ✅ Chất lượng phân tích tương đương
- ✅ Có thể xử lý nhiều file hơn

## 🚨 Lưu Ý

1. **API Key:** Giữ bí mật, không commit vào git
2. **Chi Phí:** Monitor usage tại https://platform.openai.com/usage
3. **Rate Limits:** OpenAI cũng có rate limits nhưng cao hơn Gemini
4. **Backup:** Giữ workflow cũ để có thể quay lại Gemini khi cần

## 🔄 Quay Lại Gemini (Khi Cần)

1. Thay node "OpenAI Chat Model" → "Google Gemini Chat Model"
2. Chọn credential "Google Gemini(PaLM) Api account 2"
3. Chọn model: `models/gemini-2.5-flash`
4. Test lại

## 💡 Tips

1. **Dùng GPT-3.5 Turbo** cho development/testing (rẻ hơn)
2. **Dùng GPT-4 Turbo** cho production (chất lượng cao)
3. **Monitor costs** thường xuyên
4. **Có thể dùng cả 2:** Gemini làm primary, GPT làm fallback

