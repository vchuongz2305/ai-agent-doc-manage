# Các Model AI Thay Thế Cho Google Gemini

## 🎯 Mục Đích

Khi Google Gemini bị rate limit (429), có thể dùng các model AI khác trong n8n.

## 📋 Các Model AI Phổ Biến Trong n8n

### 1. OpenAI GPT-4 / GPT-3.5 Turbo ✅ (Khuyến nghị)

**Ưu điểm:**
- ✅ Quota cao hơn Gemini (thường ít bị rate limit)
- ✅ Tốc độ nhanh
- ✅ Hỗ trợ tốt trong n8n
- ✅ Có nhiều model: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo

**Nhược điểm:**
- ❌ Có phí (nhưng rẻ)
- ❌ Cần API key từ OpenAI

**Node trong n8n:**
- `@n8n/n8n-nodes-langchain.lmChatOpenAi`
- `@n8n/n8n-nodes-langchain.openAi`

**Setup:**
1. Tạo API key tại: https://platform.openai.com/api-keys
2. Thêm credential trong n8n: "OpenAI API"
3. Chọn model: `gpt-4-turbo-preview` hoặc `gpt-3.5-turbo`

### 2. Anthropic Claude ✅

**Ưu điểm:**
- ✅ Quota tốt, ít bị rate limit
- ✅ Context window lớn (200k tokens)
- ✅ Chất lượng cao

**Nhược điểm:**
- ❌ Có phí
- ❌ Cần API key từ Anthropic

**Node trong n8n:**
- `@n8n/n8n-nodes-langchain.lmChatAnthropic`

**Setup:**
1. Tạo API key tại: https://console.anthropic.com/
2. Thêm credential trong n8n: "Anthropic API"
3. Chọn model: `claude-3-opus-20240229` hoặc `claude-3-sonnet-20240229`

### 3. Cohere ✅

**Ưu điểm:**
- ✅ Quota tốt
- ✅ Tốc độ nhanh
- ✅ Phù hợp cho text analysis

**Nhược điểm:**
- ❌ Có phí
- ❌ Ít phổ biến hơn

**Node trong n8n:**
- `@n8n/n8n-nodes-langchain.lmChatCohere`

### 4. Hugging Face Models ✅

**Ưu điểm:**
- ✅ Nhiều model miễn phí
- ✅ Có thể self-host

**Nhược điểm:**
- ❌ Cần setup phức tạp hơn
- ❌ Tốc độ có thể chậm hơn

**Node trong n8n:**
- `@n8n/n8n-nodes-langchain.lmChatHuggingFace`

### 5. Local Models (Ollama) ✅

**Ưu điểm:**
- ✅ Miễn phí hoàn toàn
- ✅ Không có rate limit
- ✅ Privacy tốt (chạy local)

**Nhược điểm:**
- ❌ Cần server riêng
- ❌ Tốc độ phụ thuộc vào hardware
- ❌ Chất lượng có thể thấp hơn

**Node trong n8n:**
- `@n8n/n8n-nodes-langchain.lmChatOllama`

## 🚀 Cách Thay Thế Trong Workflow

### Option 1: Thay Node Gemini → OpenAI GPT

**Bước 1: Thêm OpenAI Credential**
1. Vào n8n → Settings → Credentials
2. Add credential → "OpenAI API"
3. Nhập API key từ OpenAI

**Bước 2: Thay Node**
1. Mở workflow "Flow 1"
2. Tìm node "comprehensive_analysis" (Google Gemini)
3. Click vào node → Change node type
4. Chọn: `@n8n/n8n-nodes-langchain.lmChatOpenAi`
5. Chọn credential: "OpenAI API"
6. Chọn model: `gpt-4-turbo-preview` hoặc `gpt-3.5-turbo`

**Bước 3: Giữ Nguyên Prompt**
- System message và text input giữ nguyên
- Chỉ thay node type và credential

### Option 2: Dùng Fallback (Gemini → GPT)

**Tạo workflow với fallback logic:**
1. Thử Gemini trước
2. Nếu lỗi 429 → Tự động chuyển sang GPT
3. Xem: `workflows/Flow 1 - With Fallback.json`

## 💰 So Sánh Chi Phí

### Google Gemini
- **Free tier:** 15 RPM, 1500 RPD
- **Paid:** $0.00025/1K tokens (input), $0.0005/1K tokens (output)

### OpenAI GPT-4 Turbo
- **Paid:** $0.01/1K tokens (input), $0.03/1K tokens (output)
- **Quota:** Cao hơn Gemini

### OpenAI GPT-3.5 Turbo
- **Paid:** $0.0005/1K tokens (input), $0.0015/1K tokens (output)
- **Rẻ hơn GPT-4, chất lượng vẫn tốt**

### Anthropic Claude
- **Paid:** $0.015/1K tokens (input), $0.075/1K tokens (output)
- **Đắt hơn nhưng chất lượng cao**

## 📊 So Sánh Nhanh

| Model | Quota | Tốc Độ | Chi Phí | Chất Lượng |
|-------|-------|--------|---------|------------|
| Gemini | ⚠️ Thấp | ⚡ Nhanh | 💰 Rẻ | ⭐⭐⭐⭐ |
| GPT-4 Turbo | ✅ Cao | ⚡ Nhanh | 💰💰 Trung bình | ⭐⭐⭐⭐⭐ |
| GPT-3.5 Turbo | ✅ Cao | ⚡⚡ Rất nhanh | 💰 Rẻ | ⭐⭐⭐⭐ |
| Claude | ✅ Cao | ⚡ Nhanh | 💰💰💰 Đắt | ⭐⭐⭐⭐⭐ |
| Ollama (Local) | ✅ Không giới hạn | 🐌 Chậm | 🆓 Miễn phí | ⭐⭐⭐ |

## ✅ Khuyến Nghị

### Cho Production:
1. **OpenAI GPT-3.5 Turbo** - Cân bằng tốt giữa chi phí và chất lượng
2. **OpenAI GPT-4 Turbo** - Nếu cần chất lượng cao nhất
3. **Anthropic Claude** - Nếu cần context window lớn

### Cho Development/Testing:
1. **Ollama (Local)** - Miễn phí, không rate limit
2. **Hugging Face** - Nhiều model miễn phí

### Fallback Strategy:
- **Primary:** Gemini (rẻ)
- **Fallback:** GPT-3.5 Turbo (khi Gemini bị rate limit)

## 🔧 Workflow Example

Xem file: `workflows/Flow 1 - With OpenAI GPT.json` để xem cách thay thế.

## 📝 Lưu Ý

1. **API Keys:** Cần có API key từ provider
2. **Cost:** Monitor usage để tránh chi phí cao
3. **Rate Limits:** Mỗi provider có rate limit riêng
4. **Quality:** Test với data thật để so sánh chất lượng

## 🚀 Next Steps

1. Chọn model phù hợp với nhu cầu
2. Tạo API key
3. Thay node trong workflow
4. Test và so sánh kết quả

