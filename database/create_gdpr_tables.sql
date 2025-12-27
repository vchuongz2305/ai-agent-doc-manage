-- ============================================
-- SQL Schema cho Flow 2 và Flow 3
-- ============================================

-- Bảng 1: gdpr_compliance_results (Flow 2)
-- Lưu kết quả phân tích GDPR compliance
-- ============================================
CREATE TABLE IF NOT EXISTS gdpr_compliance_results (
    id SERIAL PRIMARY KEY,
    processing_id VARCHAR(255) UNIQUE NOT NULL,
    audit_id VARCHAR(255),
    
    -- Thông tin file cơ bản
    file_name VARCHAR(500),
    file_url TEXT,
    cloudinary_url TEXT,
    user_id VARCHAR(255),
    department VARCHAR(100),
    uploader VARCHAR(255),
    
    -- Kết quả phân tích từ Flow 1 (nếu có)
    analysis_results JSONB,
    
    -- Kết quả GDPR từ Flow 2
    gdpr_decision VARCHAR(50), -- 'delete', 'anonymize', 'allow'
    gdpr_justification TEXT,
    legal_basis VARCHAR(100), -- 'consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'
    retention_days INTEGER DEFAULT 30,
    redaction_fields TEXT[], -- Array of fields to redact
    personal_data_found TEXT[], -- Array of personal data found
    sensitive_data_detected BOOLEAN DEFAULT FALSE,
    data_volume VARCHAR(20), -- 'high', 'medium', 'low'
    notify_dpo BOOLEAN DEFAULT FALSE,
    
    -- Status và action
    status VARCHAR(50) DEFAULT 'gdpr_completed',
    gdpr_action_performed VARCHAR(50), -- 'delete', 'anonymize', 'allow'
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ai_decision_timestamp TIMESTAMP,
    gdpr_completed_at TIMESTAMP,
    
    -- Metadata
    workflow_source VARCHAR(100) DEFAULT 'flow2-gdpr-compliance',
    flow2_completed BOOLEAN DEFAULT TRUE
);

-- Indexes cho bảng gdpr_compliance_results
CREATE INDEX IF NOT EXISTS idx_gdpr_processing_id ON gdpr_compliance_results(processing_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_user_id ON gdpr_compliance_results(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_decision ON gdpr_compliance_results(gdpr_decision);
CREATE INDEX IF NOT EXISTS idx_gdpr_status ON gdpr_compliance_results(status);
CREATE INDEX IF NOT EXISTS idx_gdpr_created_at ON gdpr_compliance_results(created_at);

-- ============================================
-- Bảng 2: document_sharing (Flow 3)
-- Lưu thông tin chia sẻ tài liệu
-- ============================================
CREATE TABLE IF NOT EXISTS document_sharing (
    id SERIAL PRIMARY KEY,
    processing_id VARCHAR(255) NOT NULL,
    sharing_id VARCHAR(255) UNIQUE, -- Unique ID cho mỗi lần chia sẻ
    
    -- Thông tin file
    file_name VARCHAR(500),
    file_url TEXT,
    cloudinary_url TEXT,
    docx_url TEXT, -- Google Docs URL (nếu có)
    user_id VARCHAR(255),
    department VARCHAR(100),
    
    -- Thông tin chia sẻ
    recipient_emails TEXT[], -- Array of recipient emails
    recipient_names TEXT[], -- Array of recipient names (optional)
    sharing_method VARCHAR(50), -- 'email', 'link', 'drive'
    share_link TEXT, -- Shareable link (nếu chia sẻ qua link)
    access_level VARCHAR(50) DEFAULT 'viewer', -- 'viewer', 'commenter', 'editor'
    
    -- Thông tin GDPR từ Flow 2
    gdpr_decision VARCHAR(50), -- 'delete', 'anonymize', 'allow'
    gdpr_approved BOOLEAN DEFAULT FALSE, -- Đã được frontend approve để chia sẻ
    legal_basis VARCHAR(100),
    retention_days INTEGER,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'cancelled'
    sharing_status VARCHAR(50), -- 'queued', 'processing', 'completed', 'failed'
    
    -- Email tracking
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP,
    email_subject TEXT,
    email_body TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sharing_requested_at TIMESTAMP,
    sharing_completed_at TIMESTAMP,
    
    -- Metadata
    workflow_source VARCHAR(100) DEFAULT 'flow3-document-sharing',
    flow3_completed BOOLEAN DEFAULT FALSE,
    notes TEXT -- Additional notes
);

-- Indexes cho bảng document_sharing
CREATE INDEX IF NOT EXISTS idx_sharing_processing_id ON document_sharing(processing_id);
CREATE INDEX IF NOT EXISTS idx_sharing_sharing_id ON document_sharing(sharing_id);
CREATE INDEX IF NOT EXISTS idx_sharing_user_id ON document_sharing(user_id);
CREATE INDEX IF NOT EXISTS idx_sharing_status ON document_sharing(status);
CREATE INDEX IF NOT EXISTS idx_sharing_gdpr_approved ON document_sharing(gdpr_approved);
CREATE INDEX IF NOT EXISTS idx_sharing_created_at ON document_sharing(created_at);

-- Foreign key constraint (optional, nếu muốn enforce referential integrity)
-- ALTER TABLE document_sharing ADD CONSTRAINT fk_sharing_processing_id 
--     FOREIGN KEY (processing_id) REFERENCES gdpr_compliance_results(processing_id) 
--     ON DELETE CASCADE;

-- ============================================
-- Comments cho documentation
-- ============================================
COMMENT ON TABLE gdpr_compliance_results IS 'Lưu kết quả phân tích GDPR compliance từ Flow 2';
COMMENT ON TABLE document_sharing IS 'Lưu thông tin chia sẻ tài liệu từ Flow 3';

COMMENT ON COLUMN gdpr_compliance_results.gdpr_decision IS 'Quyết định GDPR: delete, anonymize, hoặc allow';
COMMENT ON COLUMN gdpr_compliance_results.legal_basis IS 'Cơ sở pháp lý cho việc xử lý dữ liệu';
COMMENT ON COLUMN document_sharing.gdpr_approved IS 'Đã được frontend approve để chia sẻ sau khi kiểm tra GDPR';

