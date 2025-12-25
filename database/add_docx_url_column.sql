-- Thêm cột docx_url vào bảng documents để lưu URL của file DOCX phân tích
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS docx_url TEXT;

-- Tạo index để tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_documents_docx_url ON documents(docx_url) WHERE docx_url IS NOT NULL;

-- Comment cho cột
COMMENT ON COLUMN documents.docx_url IS 'URL của file DOCX chứa nội dung phân tích, được lưu trên Cloudinary';

