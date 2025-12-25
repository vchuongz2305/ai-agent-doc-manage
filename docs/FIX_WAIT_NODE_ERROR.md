# Fix Lỗi Wait Node trong n8n

## 🚨 Lỗi

```
Cannot put execution to wait because 'dateTime` parameter is not a valid date. 
Please pick a specific date and time to wait until.
```

## 🔍 Nguyên Nhân

Node "Wait" trong n8n có 2 chế độ:
1. **"For a Duration"** - Đợi một khoảng thời gian (ví dụ: 5 giây)
2. **"Until a Date"** - Đợi đến một thời điểm cụ thể

Cấu hình trong workflow JSON không đúng format mà n8n mong đợi.

## ✅ Giải Pháp

### Cách 1: Dùng Code Node (Đã Fix) ✅

**Thay vì dùng Wait node, dùng Code node:**

```javascript
// Delay 5 giây trước khi gọi Gemini API để tránh rate limit
console.log('⏳ Waiting 5 seconds before AI call...');
await new Promise(resolve => setTimeout(resolve, 5000));
console.log('✅ Wait completed, proceeding to AI node');
return $input.all();
```

**Ưu điểm:**
- ✅ Đơn giản, không cần cấu hình phức tạp
- ✅ Hoạt động ổn định
- ✅ Dễ debug

### Cách 2: Sửa Wait Node (Nếu muốn dùng Wait node)

**Trong n8n UI:**
1. Click vào node "Wait Before AI"
2. Chọn **"Wait Type"**: "For a Duration"
3. **Duration**: `5`
4. **Unit**: "Seconds"
5. Lưu

**Hoặc trong JSON (nếu biết format đúng):**
```json
{
  "parameters": {
    "resume": "afterTimeInterval",
    "amount": 5,
    "unit": "seconds"
  },
  "type": "n8n-nodes-base.wait",
  "typeVersion": 1.1
}
```

## 📋 Workflow Đã Fix

**File:** `workflows/Flow 1 - With Retry & Delay.json`

**Thay đổi:**
- ❌ Xóa: Wait node (gây lỗi)
- ✅ Thêm: Code node với delay 5 giây
- ✅ Giữ nguyên: Retry settings cho node AI

## 🧪 Test Sau Khi Fix

1. **Import workflow mới** vào n8n
2. **Upload file PDF** từ frontend
3. **Kiểm tra logs:**
   - ✅ Có log "⏳ Waiting 5 seconds..."
   - ✅ Sau 5 giây có log "✅ Wait completed"
   - ✅ Workflow tiếp tục đến node AI
   - ✅ Không còn lỗi "dateTime parameter"

## 💡 Best Practice

**Nên dùng Code node cho delay:**
- Đơn giản hơn
- Dễ customize (có thể thay đổi delay dựa trên điều kiện)
- Không phụ thuộc vào version của n8n

**Ví dụ delay có điều kiện:**
```javascript
// Delay dựa trên số lần retry
const retryCount = $json.retryCount || 0;
const delay = 5000 * (retryCount + 1); // 5s, 10s, 15s...

console.log(`⏳ Waiting ${delay/1000}s (retry: ${retryCount})...`);
await new Promise(resolve => setTimeout(resolve, delay));
return $input.all();
```

## ✅ Kết Quả

Sau khi fix:
- ✅ Không còn lỗi "dateTime parameter"
- ✅ Delay 5 giây hoạt động đúng
- ✅ Workflow chạy ổn định
- ✅ Tránh được rate limit

