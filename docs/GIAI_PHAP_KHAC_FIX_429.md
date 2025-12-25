# Các Giải Pháp Khác Để Fix Lỗi 429 Rate Limit

## 🚨 Vấn Đề

Vẫn gặp lỗi **429 Too Many Requests** mặc dù đã:
- ✅ Thêm delay 15-20 giây
- ✅ Retry với exponential backoff
- ✅ Combine nodes (1 thay vì 6-7)

## 🎯 Các Giải Pháp Khác

### Giải Pháp 1: Upgrade Quota Trong Google Cloud Console ✅

**Cách làm:**
1. Vào: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas
2. Tìm quota: **"Requests per minute"** hoặc **"Requests per day"**
3. Click **"Edit Quotas"**
4. Request tăng quota (ví dụ: 60 RPM → 300 RPM)
5. Điền form và submit
6. Đợi Google approve (thường 1-2 ngày)

**Lợi ích:**
- ✅ Tăng quota thực sự
- ✅ Không cần thay đổi code
- ✅ Giải quyết triệt để

### Giải Pháp 2: Dùng Multiple API Keys & Rotate ✅

**Cách làm:**
1. Tạo 2-3 Google Gemini API keys khác nhau
2. Rotate keys khi một key bị rate limit
3. Xem script: `api/rotate-api-keys.js`

**Code example:**
```javascript
const apiKeys = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3
];

// Chọn key dựa trên hash
const keyIndex = hash(processingId) % apiKeys.length;
const selectedKey = apiKeys[keyIndex];
```

**Lợi ích:**
- ✅ Tăng capacity (3 keys = 3x quota)
- ✅ Tự động failover
- ✅ Không cần upgrade plan

### Giải Pháp 3: Implement Caching ✅

**Cách làm:**
1. Lưu kết quả AI vào database/cache
2. Check cache trước khi gọi AI
3. Reuse kết quả cho file tương tự
4. Xem: `api/gemini-cache.js`

**Code example:**
```javascript
const cache = getGeminiCache();

// Check cache trước
const cached = await cache.get(fileName, fileContent);
if (cached) {
  return cached; // Reuse kết quả
}

// Gọi AI nếu chưa có cache
const result = await callGeminiAPI(fileContent);

// Lưu vào cache
await cache.set(fileName, fileContent, result);
```

**Lợi ích:**
- ✅ Tránh gọi lại cùng một file
- ✅ Giảm số request đáng kể
- ✅ Tăng tốc độ (cache nhanh hơn API)

### Giải Pháp 4: Request Queue System ✅

**Cách làm:**
1. Queue tất cả request
2. Xử lý tuần tự với delay
3. Tránh gọi quá nhiều cùng lúc
4. Xem: `api/request-queue.js`

**Code example:**
```javascript
const queue = getRequestQueue({ delayBetweenRequests: 20000 });

// Thêm vào queue
await queue.add(async () => {
  return await callGeminiAPI(fileContent);
});
```

**Lợi ích:**
- ✅ Đảm bảo không vượt rate limit
- ✅ Tự động throttle
- ✅ Xử lý tuần tự

### Giải Pháp 5: Upgrade Google Gemini Plan ✅

**Cách làm:**
1. Vào: https://console.cloud.google.com/billing
2. Upgrade Google Cloud billing plan
3. Hoặc enable billing cho Gemini API
4. Quota sẽ tự động tăng

**Lợi ích:**
- ✅ Quota cao hơn
- ✅ Priority support
- ✅ Không cần thay đổi code

### Giải Pháp 6: Dùng Local Model (Ollama) ✅

**Cách làm:**
1. Cài Ollama trên server
2. Download model (ví dụ: `llama2`, `mistral`)
3. Thay node Gemini → Ollama trong n8n
4. Không có rate limit (chạy local)

**Setup:**
```bash
# Cài Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Download model
ollama pull llama2

# Test
ollama run llama2
```

**Lợi ích:**
- ✅ Không có rate limit
- ✅ Miễn phí
- ✅ Privacy tốt (local)

**Nhược điểm:**
- ❌ Cần server riêng
- ❌ Tốc độ phụ thuộc hardware
- ❌ Chất lượng có thể thấp hơn

### Giải Pháp 7: Batch Processing ✅

**Cách làm:**
1. Thu thập nhiều file
2. Gộp thành batch
3. Gọi AI 1 lần cho cả batch
4. Parse kết quả cho từng file

**Lợi ích:**
- ✅ Giảm số request
- ✅ Tận dụng context window lớn
- ✅ Hiệu quả hơn

### Giải Pháp 8: Throttle Trong Backend ✅

**Cách làm:**
1. Thêm rate limiter trong Express.js
2. Giới hạn số request/giờ từ frontend
3. Queue requests nếu vượt limit

**Code example:**
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 10 // 10 requests/giờ
});

app.use('/api/analyze', limiter);
```

**Lợi ích:**
- ✅ Kiểm soát từ backend
- ✅ Tránh spam từ frontend
- ✅ Bảo vệ API

## 📋 Checklist Áp Dụng

### Ngay Lập Tức:
- [ ] **Upgrade quota** trong Google Cloud Console
- [ ] **Implement caching** để tránh gọi lại
- [ ] **Throttle trong backend** để kiểm soát requests

### Trung Hạn:
- [ ] **Tạo multiple API keys** và rotate
- [ ] **Implement request queue** để xử lý tuần tự
- [ ] **Upgrade plan** nếu cần

### Dài Hạn:
- [ ] **Setup Ollama** cho local processing
- [ ] **Implement batch processing** để tối ưu
- [ ] **Monitor và optimize** thường xuyên

## 🚀 Khuyến Nghị Thứ Tự

1. **Ngay:** Upgrade quota + Implement caching
2. **Tuần này:** Multiple API keys + Request queue
3. **Tháng này:** Upgrade plan hoặc setup Ollama

## 💡 Best Practices

1. **Luôn có caching** để tránh gọi lại
2. **Monitor quota** thường xuyên
3. **Có fallback** (multiple keys hoặc models)
4. **Throttle từ backend** để kiểm soát
5. **Queue requests** để xử lý tuần tự

## 🔗 Links Hữu Ích

- **Quota Management:** https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas
- **Usage Monitor:** https://ai.google.dev/usage?tab=rate-limit
- **Billing:** https://console.cloud.google.com/billing
- **API Keys:** https://console.cloud.google.com/apis/credentials

## ✅ Kết Quả Mong Đợi

Sau khi áp dụng:
- ✅ Quota cao hơn (upgrade)
- ✅ Ít request hơn (caching)
- ✅ Tự động throttle (queue)
- ✅ Có fallback (multiple keys)
- ✅ Không còn rate limit

