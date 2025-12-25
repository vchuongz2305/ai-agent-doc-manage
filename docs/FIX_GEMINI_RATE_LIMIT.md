# Sửa Lỗi Rate Limit Google Gemini API

## 🔍 Vấn đề

Lỗi: **"The service is receiving too many requests from you"**
- HTTP 429 Too Many Requests
- "You exceeded your current quota, please check your plan and billing details"
- Xảy ra ở node "main_theme" trong Flow 1

## 🔍 Nguyên nhân

1. **Quá nhiều request cùng lúc**: Workflow gọi nhiều node Gemini cùng lúc
2. **Không có delay**: Các request gửi liên tiếp không có khoảng cách
3. **Vượt quota**: Google Gemini API có giới hạn request/giờ
4. **Không có retry logic**: Khi fail không tự động retry

## ✅ Giải pháp

### Giải pháp 1: Thêm Delay giữa các Request (Khuyến nghị)

**Trong n8n workflow:**

1. **Thêm node "Wait" trước mỗi node Gemini**:
   - Vào workflow editor
   - Thêm node "Wait" (từ n8n-nodes-base.wait)
   - Đặt delay: **2-5 giây** giữa mỗi request
   - Đặt trước node "main_theme" và các node Gemini khác

2. **Hoặc dùng "Set" node để thêm delay**:
   ```javascript
   // Thêm delay 3 giây
   await new Promise(resolve => setTimeout(resolve, 3000));
   return $input.all();
   ```

### Giải pháp 2: Thêm Retry Logic

**Trong n8n workflow:**

1. **Enable "Retry on Fail" cho node Gemini**:
   - Click vào node "main_theme"
   - Vào tab "Settings"
   - Enable "Retry on Fail"
   - Max retries: 3
   - Retry delay: 5000ms (5 giây)

2. **Hoặc dùng "Error Trigger" node**:
   - Thêm node "Error Trigger" sau node Gemini
   - Xử lý lỗi 429 và retry sau delay

### Giải pháp 3: Giảm Số Lượng Request

**Tối ưu workflow:**

1. **Combine các node AI**:
   - Thay vì gọi nhiều node Gemini riêng biệt
   - Gọi 1 node Gemini với prompt tổng hợp
   - Parse kết quả để lấy nhiều thông tin

2. **Cache kết quả**:
   - Lưu kết quả AI vào database
   - Reuse kết quả cho file tương tự

### Giải pháp 4: Upgrade Google Gemini API Plan

1. **Kiểm tra quota hiện tại**:
   - Vào: https://ai.google.dev/usage?tab=rate-limit
   - Xem quota và usage hiện tại

2. **Upgrade plan**:
   - Vào Google Cloud Console
   - Upgrade Gemini API quota
   - Hoặc request quota increase

### Giải pháp 5: Dùng Multiple API Keys

**Phân bổ request:**

1. **Tạo nhiều Google Gemini API keys**:
   - Flow 1: dùng API key 1
   - Flow 2: dùng API key 2
   - Flow 3: dùng API key 3

2. **Rotate keys**:
   - Nếu một key bị rate limit
   - Tự động switch sang key khác

## 🛠️ Cách Fix Ngay (Trong n8n)

### Bước 1: Thêm Delay Node

1. Mở workflow "Flow 1"
2. Tìm node "main_theme" (Google Gemini Chat Model)
3. **Thêm node "Wait" trước node này**:
   - Type: `n8n-nodes-base.wait`
   - Wait Type: "For a Duration"
   - Duration: 3 seconds
4. Lưu workflow

### Bước 2: Enable Retry

1. Click vào node "main_theme"
2. Vào tab "Settings" (bánh răng ⚙️)
3. Enable "Retry on Fail"
4. Max Retries: 3
5. Retry Delay: 5000ms
6. Lưu

### Bước 3: Test lại

1. Chạy workflow với file mới
2. Kiểm tra xem còn lỗi 429 không
3. Nếu vẫn lỗi, tăng delay lên 5-10 giây

## 📋 Workflow Nodes Cần Fix

### Flow 1:
- ✅ "main_theme" - Google Gemini Chat Model
- ✅ "document_summary" - Google Gemini Chat Model  
- ✅ "key_takeaways" - Google Gemini Chat Model
- ✅ "gaps_and_limitations" - Google Gemini Chat Model
- ✅ "follow_up_questions" - Google Gemini Chat Model
- ✅ "terminology_to_clarify" - Google Gemini Chat Model

**Tất cả các node này cần có delay trước khi gọi!**

### Flow 2:
- ✅ "🤖 AI Quyết định phê duyệt" - Google Gemini

### Flow 3:
- ✅ "3️⃣ AI GDPR Decision" - Google Gemini

## 💡 Best Practices

1. **Luôn có delay** giữa các request AI (2-5 giây)
2. **Enable retry** cho tất cả node AI
3. **Monitor quota** thường xuyên
4. **Cache results** khi có thể
5. **Combine prompts** để giảm số request

## 🚨 Nếu Vẫn Không Được

1. **Kiểm tra quota**: https://ai.google.dev/usage?tab=rate-limit
2. **Upgrade plan**: Google Cloud Console
3. **Liên hệ Google Support**: Để request quota increase
4. **Tạm thời**: Giảm số lượng node AI hoặc chạy workflow vào giờ ít traffic

## ✅ Sau Khi Fix

Workflow sẽ:
- ✅ Tự động retry khi gặp lỗi 429
- ✅ Có delay giữa các request
- ✅ Không bị rate limit nữa
- ✅ Hoạt động ổn định hơn

