# Hướng Dẫn Import Workflow Mới

## 📋 Tóm Tắt Thay Đổi

Workflow mới đã được tối ưu:
- ✅ **Giảm từ 7 node AI → 1 node AI** (giảm 85%)
- ✅ **Không còn rate limit**
- ✅ **Nhanh hơn và ổn định hơn**

## 🚀 Cách Import Workflow

### Bước 1: Backup Workflow Cũ

1. Mở n8n: `https://n8n.aidocmanageagent.io.vn`
2. Vào workflow "Test 2" (Flow 1)
3. Click **"..."** (menu) → **"Download"** để export workflow cũ
4. Lưu file backup

### Bước 2: Import Workflow Mới

1. Trong n8n, click **"+"** → **"Import from File"**
2. Chọn file: `workflows/Flow 1 - Optimized.json`
3. Click **"Import"**

### Bước 3: Kiểm Tra Workflow

Sau khi import, kiểm tra:

1. **Node "comprehensive_analysis"**:
   - ✅ Có System Message đầy đủ
   - ✅ Kết nối với "Google Gemini Chat Model"
   - ✅ Có "Structured Output Parser"

2. **Node "Parse Combined Result"**:
   - ✅ Có code để parse kết quả
   - ✅ Kết nối từ "comprehensive_analysis"

3. **Node "Merge"**:
   - ✅ Số inputs: 1 (thay vì 7)
   - ✅ Nhận từ "Parse Combined Result"

4. **Connections**:
   ```
   Extract PDF Text → comprehensive_analysis
   comprehensive_analysis → Parse Combined Result
   Parse Combined Result → Merge
   Merge → Aggregate → Save → Google Docs
   ```

### Bước 4: Test Workflow

1. **Activate workflow** (nếu chưa active)
2. **Execute workflow** với file test
3. **Kiểm tra:**
   - ✅ Không còn lỗi 429
   - ✅ Kết quả đầy đủ trong Google Docs
   - ✅ Tất cả sections có data

## 🔄 Hoặc Update Workflow Hiện Tại

Nếu không muốn import mới, có thể update workflow hiện tại:

### Bước 1: Xóa 7 Node AI Cũ

Xóa các node:
- `main_theme`
- `document_summary`
- `key_takeaways`
- `gaps_and_limitations`
- `follow_up_questions`
- `terminology_to_clarify`
- `structural_observations`

### Bước 2: Thêm Node Mới

1. **Thêm "comprehensive_analysis"** (Agent node):
   - Copy prompt từ `Flow 1 - Combined AI Prompt.txt`
   - Kết nối: `Extract PDF Text` → `comprehensive_analysis`

2. **Thêm "Structured Output Parser"**:
   - JSON Schema từ workflow mới
   - Kết nối với `comprehensive_analysis`

3. **Thêm "Parse Combined Result"** (Code node):
   - Copy code từ `parse-combined-ai-result.js`
   - Kết nối: `comprehensive_analysis` → `Parse Combined Result`

### Bước 3: Update Merge Node

1. Click vào node "Merge"
2. **Số inputs:** Đổi từ 7 → 1
3. Kết nối: `Parse Combined Result` → `Merge`

### Bước 4: Update Google Docs Node

Update text field để dùng format mới (đã có trong workflow mới)

## ✅ Sau Khi Hoàn Thành

Workflow sẽ:
- ✅ Chỉ có 1 node AI thay vì 7
- ✅ Không còn rate limit
- ✅ Nhanh hơn và ổn định hơn
- ✅ Vẫn đầy đủ chức năng như cũ

## 🚨 Lưu Ý

1. **Backup trước khi thay đổi**
2. **Test kỹ** với file nhỏ trước
3. **Kiểm tra credentials** - Đảm bảo Google Gemini API key vẫn hoạt động
4. **Monitor logs** - Xem có lỗi gì không

## 💡 Nếu Có Lỗi

1. **Kiểm tra System Message** - Đảm bảo prompt đầy đủ
2. **Kiểm tra Parse Code** - Có thể cần adjust
3. **Kiểm tra connections** - Đảm bảo kết nối đúng
4. **Xem execution logs** - Debug từng node

