# Hướng Dẫn Fix Lỗi Rate Limit Google Gemini

## 🚨 Vấn Đề

Workflow đang gọi **6 node Gemini cùng lúc**:
1. `main_theme` - Phân tích chủ đề chính
2. `key_takeaways` - Điểm chính
3. `gaps_and_limitations` - Khoảng trống và hạn chế
4. `document_summary` - Tóm tắt tài liệu
5. `follow_up_questions` - Câu hỏi tiếp theo
6. `terminology_to_clarify` - Thuật ngữ cần làm rõ

→ **Quá nhiều request cùng lúc → Rate limit!**

## ✅ Cách Fix Trong n8n

### Bước 1: Mở Workflow "Flow 1"

1. Đăng nhập n8n: `https://n8n.aidocmanageagent.io.vn`
2. Vào **Workflows** → Tìm **"Test 2"** (Flow 1)
3. Click **"Edit"** để mở workflow editor

### Bước 2: Thêm Delay Trước Mỗi Node Gemini

**Cách 1: Dùng Node "Wait" (Khuyến nghị)**

1. Tìm node **"main_theme"** (Google Gemini Chat Model)
2. **Thêm node "Wait" trước node này**:
   - Click **"+"** để thêm node mới
   - Tìm và chọn **"Wait"** (n8n-nodes-base.wait)
   - Kết nối: `Extract PDF Text` → `Wait` → `main_theme`
3. **Cấu hình Wait node**:
   - **Wait Type**: "For a Duration"
   - **Duration**: `3` seconds
   - **Unit**: Seconds
4. **Lặp lại cho các node khác**:
   - Thêm Wait trước `key_takeaways` (delay 3s)
   - Thêm Wait trước `gaps_and_limitations` (delay 3s)
   - Thêm Wait trước `document_summary` (delay 3s)
   - Thêm Wait trước `follow_up_questions` (delay 3s)
   - Thêm Wait trước `terminology_to_clarify` (delay 3s)

**Cách 2: Dùng Code Node để Delay**

1. Thêm **"Code"** node trước mỗi Gemini node
2. Code:
```javascript
// Delay 3 giây trước khi gọi Gemini
await new Promise(resolve => setTimeout(resolve, 3000));
return $input.all();
```

### Bước 3: Enable Retry cho Tất Cả Node Gemini

1. Click vào node **"main_theme"**
2. Vào tab **"Settings"** (biểu tượng bánh răng ⚙️)
3. Enable **"Retry on Fail"**:
   - ✅ **Retry on Fail**: Enabled
   - **Max Retries**: `3`
   - **Retry Delay**: `5000` ms (5 giây)
4. **Lặp lại cho tất cả node Gemini khác**

### Bước 4: Thay Đổi Execution Order (Tùy chọn)

**Thay vì chạy song song, chạy tuần tự:**

1. Xóa các connection song song
2. Kết nối tuần tự:
   ```
   Extract PDF Text 
   → Wait (3s) 
   → main_theme 
   → Wait (3s) 
   → key_takeaways 
   → Wait (3s) 
   → gaps_and_limitations 
   → ...
   ```

**Ưu điểm**: 
- ✅ Không bị rate limit
- ✅ Dễ debug
- ❌ Chậm hơn (nhưng ổn định hơn)

### Bước 5: Lưu và Test

1. Click **"Save"** để lưu workflow
2. Click **"Execute Workflow"** để test
3. Upload file mới và kiểm tra xem còn lỗi 429 không

## 🔧 Cấu Hình Chi Tiết

### Wait Node Settings:
```json
{
  "parameters": {
    "resume": "immediately",
    "amount": 3,
    "unit": "seconds"
  }
}
```

### Retry Settings cho Gemini Node:
```json
{
  "settings": {
    "errorHandling": {
      "retry": {
        "enabled": true,
        "maxRetries": 3,
        "retryDelay": 5000
      }
    }
  }
}
```

## 📊 So Sánh Trước/Sau

### Trước (Song song):
```
Extract PDF Text
├──→ main_theme (Gemini) ⚡
├──→ key_takeaways (Gemini) ⚡
├──→ gaps_and_limitations (Gemini) ⚡
├──→ document_summary (Gemini) ⚡
├──→ follow_up_questions (Gemini) ⚡
└──→ terminology_to_clarify (Gemini) ⚡
```
❌ **6 request cùng lúc → Rate limit!**

### Sau (Có delay):
```
Extract PDF Text
├──→ Wait (3s) → main_theme (Gemini) ✅
├──→ Wait (3s) → key_takeaways (Gemini) ✅
├──→ Wait (3s) → gaps_and_limitations (Gemini) ✅
├──→ Wait (3s) → document_summary (Gemini) ✅
├──→ Wait (3s) → follow_up_questions (Gemini) ✅
└──→ Wait (3s) → terminology_to_clarify (Gemini) ✅
```
✅ **Có delay → Không bị rate limit!**

## 💡 Tips

1. **Delay tối thiểu**: 2-3 giây giữa mỗi request
2. **Retry delay**: 5-10 giây khi retry
3. **Monitor quota**: Kiểm tra https://ai.google.dev/usage thường xuyên
4. **Nếu vẫn lỗi**: Tăng delay lên 5-10 giây

## 🚨 Nếu Vẫn Không Được

1. **Kiểm tra quota**: https://ai.google.dev/usage?tab=rate-limit
2. **Upgrade plan**: Google Cloud Console → Gemini API → Quota
3. **Dùng API key khác**: Tạo key mới và rotate
4. **Giảm số node**: Combine một số node lại

## ✅ Kết Quả Mong Đợi

Sau khi fix:
- ✅ Không còn lỗi 429
- ✅ Workflow chạy ổn định
- ✅ Tự động retry khi có lỗi
- ✅ Có delay giữa các request

