-- Tạo bảng documents để lưu thông tin file
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

-- Tạo index để tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_documents_processing_id ON documents(processing_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

-- Tạo trigger để tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

