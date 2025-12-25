# Fix Rate Limit Google Gemini API - Giải Pháp Triệt Để

## 🎯 Mục Tiêu

Fix triệt để lỗi **429 Too Many Requests** từ Google Gemini API bằng nhiều giải pháp kết hợp.

## ✅ Giải Pháp 1: Combine Nodes (Đã Làm) ✅

**Trước:** 6-7 node AI → 6-7 requests → Rate limit ❌
**Sau:** 1 node AI → 1 request → Giảm 85% số request ✅

## ✅ Giải Pháp 2: Thêm Delay Trước AI Node

**Thêm node "Wait" trước node AI:**
- Delay: **5-10 giây** trước khi gọi Gemini
- Đảm bảo không gọi quá nhanh

**Trong workflow:**
```
Extract PDF Text
→ Wait (5 seconds) ✅
→ comprehensive_analysis
```

## ✅ Giải Pháp 3: Enable Retry với Exponential Backoff

**Settings cho node "comprehensive_analysis":**

1. Click vào node **"comprehensive_analysis"**
2. Vào tab **"Settings"** (⚙️)
3. Enable **"Retry on Fail"**:
   - ✅ **Retry on Fail**: Enabled
   - **Max Retries**: `5`
   - **Retry Delay**: `10000` ms (10 giây)

**Hoặc trong workflow JSON:**
```json
{
  "settings": {
    "errorHandling": {
      "retry": {
        "enabled": true,
        "maxRetries": 5,
        "retryDelay": 10000
      }
    }
  }
}
```

## ✅ Giải Pháp 4: Dùng Multiple API Keys (Rotate)

**Tạo nhiều Google Gemini API keys:**
1. Vào Google Cloud Console
2. Tạo 2-3 API keys khác nhau
3. Rotate keys khi một key bị rate limit

**Code để rotate keys:**
```javascript
// Trong Code node trước AI node
const apiKeys = [
  'key1',
  'key2', 
  'key3'
];

// Chọn key dựa trên processingId hash
const keyIndex = parseInt($('Set File Data').item.json.processingId.slice(-1)) % apiKeys.length;
const selectedKey = apiKeys[keyIndex];

// Set key vào environment hoặc pass qua
return [{
  json: {
    ...$json,
    selected_api_key: selectedKey
  }
}];
```

## ✅ Giải Pháp 5: Cache Results (Tránh Gọi Lại)

**Lưu kết quả vào database để reuse:**

1. **Check database trước khi gọi AI:**
   ```sql
   SELECT analysis_results 
   FROM documents 
   WHERE file_name = '{{ fileName }}' 
   AND analysis_results IS NOT NULL
   LIMIT 1;
   ```

2. **Nếu có kết quả cũ → Reuse**
3. **Nếu không → Gọi AI mới**

## ✅ Giải Pháp 6: Upgrade Google Gemini Quota

**Cách 1: Upgrade Plan**
1. Vào Google Cloud Console
2. Vào **APIs & Services** → **Quotas**
3. Tìm **Generative Language API**
4. Request quota increase

**Cách 2: Request Quota Increase**
1. Vào: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas
2. Click **"Edit Quotas"**
3. Request increase cho:
   - Requests per minute
   - Requests per day
   - Tokens per minute

## ✅ Giải Pháp 7: Throttle Requests (Rate Limiting)

**Thêm rate limiting logic:**

```javascript
// Code node để throttle requests
const lastRequestTime = $workflow.staticData.lastRequestTime || 0;
const minDelay = 6000; // 6 giây giữa mỗi request
const now = Date.now();
const timeSinceLastRequest = now - lastRequestTime;

if (timeSinceLastRequest < minDelay) {
  const waitTime = minDelay - timeSinceLastRequest;
  console.log(`⏳ Throttling: waiting ${waitTime}ms before next request`);
  await new Promise(resolve => setTimeout(resolve, waitTime));
}

$workflow.staticData.lastRequestTime = Date.now();
return $input.all();
```

## 🚀 Workflow Tối Ưu (Đã Tạo)

**File:** `workflows/Flow 1 - With Retry & Delay.json`

**Features:**
- ✅ 1 node AI thay vì 6-7
- ✅ Wait 5 giây trước AI node
- ✅ Retry với exponential backoff (5 retries, 10s delay)
- ✅ Error handling tốt hơn

## 📋 Checklist Fix Triệt Để

### Ngay Lập Tức:
- [ ] **Import workflow mới** với retry & delay
- [ ] **Enable retry** cho node AI (5 retries, 10s delay)
- [ ] **Thêm Wait node** (5 giây) trước AI node
- [ ] **Test workflow** với file mới

### Trung Hạn:
- [ ] **Upgrade Google Gemini quota** (nếu có thể)
- [ ] **Tạo multiple API keys** và rotate
- [ ] **Implement caching** để tránh gọi lại

### Dài Hạn:
- [ ] **Monitor usage** thường xuyên
- [ ] **Optimize prompts** để giảm token usage
- [ ] **Consider alternative AI** nếu cần

## 🔧 Cấu Hình Chi Tiết

### Node "Wait Before AI"
```json
{
  "parameters": {
    "resume": "immediately",
    "amount": 5,
    "unit": "seconds"
  }
}
```

### Node "comprehensive_analysis" Settings
```json
{
  "settings": {
    "errorHandling": {
      "retry": {
        "enabled": true,
        "maxRetries": 5,
        "retryDelay": 10000
      }
    }
  }
}
```

## 🧪 Test Sau Khi Fix

1. **Upload file PDF** từ frontend
2. **Kiểm tra logs** trong n8n:
   - ✅ Có delay 5 giây trước AI
   - ✅ Nếu lỗi 429, tự động retry sau 10s
   - ✅ Retry tối đa 5 lần
3. **Verify:**
   - ✅ Không còn lỗi 429
   - ✅ Workflow hoàn thành thành công

## 💡 Best Practices

1. **Luôn có delay** giữa các request (5-10 giây)
2. **Enable retry** cho tất cả node AI
3. **Monitor quota** thường xuyên: https://ai.google.dev/usage
4. **Cache results** khi có thể
5. **Rotate API keys** nếu cần

## 🚨 Nếu Vẫn Không Được

1. **Kiểm tra quota:** https://ai.google.dev/usage?tab=rate-limit
2. **Upgrade plan:** Google Cloud Console
3. **Liên hệ Google Support:** Để request quota increase
4. **Tạm thời:** Giảm số lượng file xử lý hoặc chạy vào giờ ít traffic

## ✅ Kết Quả Mong Đợi

Sau khi áp dụng tất cả giải pháp:
- ✅ **Giảm 85% số request** (6-7 → 1)
- ✅ **Có delay** giữa các request
- ✅ **Tự động retry** khi gặp lỗi 429
- ✅ **Exponential backoff** để tránh spam
- ✅ **Không còn rate limit** nữa

