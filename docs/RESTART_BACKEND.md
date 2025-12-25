# Hướng dẫn Restart Backend để load code mới

## ⚠️ Quan trọng

Sau khi sửa code, **PHẢI restart backend** để code mới có hiệu lực!

## 🔄 Cách restart backend

### Nếu đang chạy trong terminal:

1. **Tìm process:**
```bash
ps aux | grep "node.*unified-document-agent"
```

2. **Kill process:**
```bash
# Tìm PID (số đầu tiên trong output)
kill <PID>

# Hoặc kill tất cả
pkill -f "unified-document-agent"
```

3. **Start lại:**
```bash
cd /home/danghongnguyen/Downloads/ai-agent-doc-manage
node api/unified-document-agent.js
```

### Nếu đang chạy với PM2:

```bash
pm2 restart unified-document-agent
# hoặc
pm2 restart all
```

### Nếu đang chạy với systemd:

```bash
sudo systemctl restart your-service-name
```

## ✅ Verify backend đã restart

1. **Kiểm tra process:**
```bash
ps aux | grep "node.*unified-document-agent"
```

2. **Kiểm tra logs:**
- Xem terminal output
- Hoặc check log file nếu có

3. **Test API:**
```bash
curl http://localhost:5000/api/document/status
```

## 🧪 Test sau khi restart

1. **Upload file từ frontend**
2. **Kiểm tra backend logs:**
   - Phải thấy `[CLOUDINARY] Uploading file to Cloudinary...`
   - Phải thấy `✅ [CLOUDINARY] File uploaded successfully!`
   - Phải thấy Cloudinary URL trong logs

3. **Kiểm tra n8n execution:**
   - `cloudinary_url` phải chứa "cloudinary.com"
   - `cloudinary_public_id` phải có giá trị

## 🐛 Nếu vẫn không hoạt động

1. **Kiểm tra logs có lỗi gì không:**
   - Tìm `❌ [CLOUDINARY] CRITICAL ERROR`
   - Xem error message và stack trace

2. **Kiểm tra Cloudinary credentials:**
```bash
node api/test-cloudinary-connection.js
```

3. **Kiểm tra file có tồn tại không:**
   - Log sẽ hiển thị `File exists: true/false`

4. **Kiểm tra file size:**
   - Cloudinary free plan giới hạn 10MB/file

