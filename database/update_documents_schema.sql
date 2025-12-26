-- Script cập nhật schema bảng documents cho workflow mới
-- Chạy script này để đảm bảo database có đầy đủ các cột cần thiết

-- 1. Đảm bảo bảng documents tồn tại
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    processing_id VARCHAR(255) UNIQUE NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_url TEXT NOT NULL,
    cloudinary_url TEXT,
    user_id VARCHAR(255),
    department VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    analysis_results JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    analysis_completed_at TIMESTAMP,
    CONSTRAINT documents_processing_id_key UNIQUE (processing_id)
);

-- 2. Thêm các cột nếu chưa có (migration an toàn)
DO $$ 
BEGIN
    -- Thêm cloudinary_url nếu chưa có
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'cloudinary_url'
    ) THEN
        ALTER TABLE documents ADD COLUMN cloudinary_url TEXT;
    END IF;

    -- Thêm analysis_results nếu chưa có
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'analysis_results'
    ) THEN
        ALTER TABLE documents ADD COLUMN analysis_results JSONB;
    END IF;

    -- Thêm analysis_completed_at nếu chưa có
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'analysis_completed_at'
    ) THEN
        ALTER TABLE documents ADD COLUMN analysis_completed_at TIMESTAMP;
    END IF;

    -- Thêm docx_url nếu chưa có (giữ lại để tương thích, nhưng có thể NULL)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'docx_url'
    ) THEN
        ALTER TABLE documents ADD COLUMN docx_url TEXT;
    END IF;
END $$;

-- 3. Đảm bảo analysis_results là JSONB (nếu đang là JSON thì chuyển sang JSONB)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'analysis_results' 
        AND data_type = 'json'
    ) THEN
        -- Chuyển từ JSON sang JSONB
        ALTER TABLE documents ALTER COLUMN analysis_results TYPE JSONB USING analysis_results::jsonb;
    END IF;
END $$;

-- 4. Tạo các index cần thiết
CREATE INDEX IF NOT EXISTS idx_documents_processing_id ON documents(processing_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_analysis_completed_at ON documents(analysis_completed_at) WHERE analysis_completed_at IS NOT NULL;

-- 5. Tạo GIN index cho analysis_results để query JSON hiệu quả
CREATE INDEX IF NOT EXISTS idx_documents_analysis_results_gin ON documents USING GIN (analysis_results);

-- 6. Tạo trigger để tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Xóa trigger cũ nếu có và tạo lại
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Thêm comment cho các cột quan trọng
COMMENT ON TABLE documents IS 'Bảng lưu thông tin documents và kết quả phân tích AI';
COMMENT ON COLUMN documents.processing_id IS 'ID duy nhất cho mỗi lần xử lý document';
COMMENT ON COLUMN documents.file_url IS 'URL của file PDF gốc';
COMMENT ON COLUMN documents.cloudinary_url IS 'URL của file PDF trên Cloudinary (dùng để download và phân tích)';
COMMENT ON COLUMN documents.analysis_results IS 'Kết quả phân tích từ AI dưới dạng JSONB, bao gồm: main_theme, document_summary, key_takeaways, gaps_and_limitations, follow_up_questions, terminology_to_clarify';
COMMENT ON COLUMN documents.status IS 'Trạng thái: pending, processing, completed, failed';
COMMENT ON COLUMN documents.docx_url IS 'URL của file DOCX phân tích (không còn dùng trong workflow mới, giữ lại để tương thích)';

-- 8. Kiểm tra và hiển thị cấu trúc bảng
DO $$
BEGIN
    RAISE NOTICE 'Schema đã được cập nhật thành công!';
    RAISE NOTICE 'Cấu trúc bảng documents:';
END $$;

-- Hiển thị cấu trúc bảng
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'documents'
ORDER BY ordinal_position;

