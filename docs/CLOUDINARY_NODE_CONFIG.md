# Cấu hình Cloudinary Nodes trong N8N

## Node: Upload File to Cloudinary

### Cấu hình

```json
{
  "operation": "upload",
  "resource": "file",
  "publicId": "={{ $('Set File Data').item.json.processingId }}/{{ $('Set File Data').item.json.name.replace(/[^a-zA-Z0-9._-]/g, '_') }}",
  "binaryPropertyName": "data",
  "options": {
    "resource_type": "auto",
    "folder": "documents"
  }
}
```

### Giải thích

- **operation**: `upload` - Upload file lên Cloudinary
- **resource**: `file` - Loại resource là file
- **publicId**: Public ID cho file trên Cloudinary
  - Format: `{processingId}/{filename}`
  - Tự động replace các ký tự đặc biệt thành `_` để đảm bảo valid
- **binaryPropertyName**: `data` - Tên property chứa binary data từ HTTP Request node
- **options**:
  - **resource_type**: `auto` - Tự động detect loại file (image, video, raw, etc.)
  - **folder**: `documents` - Lưu file trong folder "documents" trên Cloudinary

### Lưu ý

1. **Binary Data**: Node này nhận binary data từ node "Download File From URL" (HTTP Request)
2. **Public ID**: Phải unique và không chứa ký tự đặc biệt
3. **Folder**: File sẽ được lưu trong folder `documents/` trên Cloudinary

## Node: Get File from Cloudinary

### Cấu hình

```json
{
  "operation": "download",
  "resource": "file",
  "publicId": "={{ $json.public_id }}",
  "options": {
    "resource_type": "auto"
  }
}
```

### Giải thích

- **operation**: `download` - Download file từ Cloudinary
- **resource**: `file` - Loại resource là file
- **publicId**: Lấy từ output của node "Upload File to Cloudinary" (`$json.public_id`)
- **options**:
  - **resource_type**: `auto` - Tự động detect loại file

### Lưu ý

1. **Public ID**: Phải match với public_id từ upload node
2. **Output**: Node này trả về binary data để node "Extract PDF Text" sử dụng

## Flow hoạt động

```
Download File From URL (HTTP Request)
  ↓ [binary data trong property "data"]
Upload File to Cloudinary
  ↓ [output: { public_id, secure_url, url, ... }]
Get File from Cloudinary
  ↓ [binary data từ Cloudinary]
Extract PDF Text
```

## Troubleshooting

### Lỗi: "Binary data not found"
- Kiểm tra HTTP Request node có trả về binary data không
- Đảm bảo `responseFormat: "file"` trong HTTP Request node
- Kiểm tra `binaryPropertyName` có đúng là "data" không

### Lỗi: "Invalid public_id"
- Public ID không được chứa ký tự đặc biệt
- Đã có replace function để xử lý: `.replace(/[^a-zA-Z0-9._-]/g, '_')`

### Lỗi: "File not found" khi download
- Kiểm tra public_id có đúng không
- Đảm bảo file đã được upload thành công
- Kiểm tra resource_type có match không

### File không hiển thị trong Cloudinary Dashboard
- Kiểm tra folder path
- Kiểm tra upload có thành công không (xem execution logs)
- Kiểm tra credentials có đúng không

## Test

Sau khi cấu hình, test workflow:

1. Gửi request đến webhook với file
2. Kiểm tra execution logs trong N8N
3. Kiểm tra file trong Cloudinary Dashboard
4. Đảm bảo file được download và extract text thành công

