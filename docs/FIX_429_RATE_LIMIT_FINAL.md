# Fix Lỗi 429 Rate Limit - Giải Pháp Cuối Cùng

## 🚨 Vấn Đề

Vẫn gặp lỗi **429 Too Many Requests** mặc dù đã có:
- ✅ Delay 5 giây
- ✅ Retry settings
- ✅ Combine nodes (1 node thay vì 6-7)

## 🔍 Nguyên Nhân

1. **Delay 5 giây không đủ** - Quota có thể đã bị vượt quá
2. **Retry delay 10 giây quá ngắn** - Cần đợi lâu hơn khi gặp 429
3. **Quota đã bị vượt quá** - Cần đợi reset (thường theo giờ/ngày)
4. **Không có jitter** - Tất cả request cùng lúc

## ✅ Giải Pháp Đã Áp Dụng

### 1. Tăng Delay Lên 15-20 Giây ✅

**Trước:** Delay 5 giây
**Sau:** Delay 15-20 giây (có random jitter)

```javascript
// Delay 15-20 giây với jitter
const baseDelay = 15000; // 15 giây
const randomDelay = Math.random() * 5000; // Thêm 0-5 giây ngẫu nhiên
const totalDelay = baseDelay + randomDelay;
```

**Lợi ích:**
- ✅ Giảm số request/phút
- ✅ Jitter tránh thundering herd
- ✅ Đảm bảo không vượt quota

### 2. Tăng Retry Delay Lên 30 Giây ✅

**Trước:** Retry delay 10 giây
**Sau:** Retry delay 30 giây

```json
{
  "settings": {
    "errorHandling": {
      "retry": {
        "enabled": true,
        "maxRetries": 5,
        "retryDelay": 30000  // 30 giây
      }
    }
  }
}
```

**Lợi ích:**
- ✅ Đợi đủ lâu để quota reset
- ✅ Tránh spam retry
- ✅ Tăng khả năng thành công

### 3. Exponential Backoff (Tự Động) ✅

n8n tự động áp dụng exponential backoff:
- Retry 1: Đợi 30s
- Retry 2: Đợi 60s
- Retry 3: Đợi 120s
- Retry 4: Đợi 240s
- Retry 5: Đợi 480s

## 📋 Cấu Hình Mới

### Node "Wait Before AI"
```javascript
// Delay 15-20 giây với jitter
const baseDelay = 15000; // 15 giây
const randomDelay = Math.random() * 5000; // 0-5 giây ngẫu nhiên
const totalDelay = baseDelay + randomDelay;

console.log(`⏳ Waiting ${Math.round(totalDelay/1000)}s before AI call...`);
await new Promise(resolve => setTimeout(resolve, totalDelay));
console.log('✅ Wait completed, proceeding to AI node');
return $input.all();
```

### Node "comprehensive_analysis" Settings
```json
{
  "settings": {
    "errorHandling": {
      "retry": {
        "enabled": true,
        "maxRetries": 5,
        "retryDelay": 30000  // 30 giây
      }
    }
  }
}
```

## 🧪 Test Sau Khi Fix

1. **Import workflow mới:**
   - File: `workflows/Flow 1 - With Retry & Delay.json`
   - Version: `with-retry-delay-v2`

2. **Upload file PDF** từ frontend

3. **Kiểm tra logs:**
   - ✅ Có log "⏳ Waiting 15-20s..."
   - ✅ Nếu lỗi 429, tự động retry sau 30s
   - ✅ Retry tối đa 5 lần với exponential backoff

4. **Verify:**
   - ✅ Không còn lỗi 429
   - ✅ Workflow hoàn thành thành công

## 🚨 Nếu Vẫn Không Được

### Bước 1: Kiểm Tra Quota

1. Vào: https://ai.google.dev/usage?tab=rate-limit
2. Kiểm tra:
   - Requests per minute (RPM)
   - Requests per day (RPD)
   - Tokens per minute (TPM)
   - Tokens per day (TPD)

### Bước 2: Đợi Quota Reset

- **Free tier:** Reset theo giờ hoặc ngày
- **Paid tier:** Reset theo billing cycle
- **Thường:** Reset vào đầu giờ mới

### Bước 3: Upgrade Quota (Nếu Cần)

1. Vào Google Cloud Console
2. APIs & Services → Quotas
3. Tìm "Generative Language API"
4. Request quota increase

### Bước 4: Tăng Delay Thêm (Tạm Thời)

Nếu vẫn bị, tăng delay lên 30-60 giây:

```javascript
const baseDelay = 30000; // 30 giây
const randomDelay = Math.random() * 30000; // 0-30 giây ngẫu nhiên
const totalDelay = baseDelay + randomDelay;
```

### Bước 5: Dùng Multiple API Keys

1. Tạo 2-3 API keys khác nhau
2. Rotate keys khi một key bị limit
3. Xem: `api/rotate-api-keys.js`

## 💡 Best Practices

1. **Luôn có delay** giữa các request (15-20 giây)
2. **Có jitter** để tránh thundering herd
3. **Retry delay đủ lâu** (30 giây trở lên)
4. **Monitor quota** thường xuyên
5. **Upgrade plan** nếu cần xử lý nhiều file

## 📊 So Sánh

### Trước:
- Delay: 5 giây
- Retry delay: 10 giây
- ❌ Vẫn bị rate limit

### Sau:
- Delay: 15-20 giây (có jitter)
- Retry delay: 30 giây
- ✅ Giảm đáng kể rate limit

## ✅ Kết Quả Mong Đợi

Sau khi áp dụng:
- ✅ Delay 15-20 giây trước mỗi request
- ✅ Retry delay 30 giây khi gặp lỗi
- ✅ Exponential backoff tự động
- ✅ Jitter tránh thundering herd
- ✅ Không còn rate limit (hoặc giảm đáng kể)

## 🔄 Nếu Vẫn Bị Rate Limit

**Có thể do:**
1. Quota đã bị vượt quá và cần đợi reset
2. Cần upgrade plan
3. Cần dùng multiple API keys

**Giải pháp:**
1. Đợi 1-2 giờ để quota reset
2. Upgrade Google Gemini API plan
3. Tạo thêm API keys và rotate

