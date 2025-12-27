#!/bin/bash

# Script để tạo bảng trực tiếp với psql (không cần sudo)
# Sử dụng: ./create_tables_direct.sh

set -e

echo "🚀 Tạo các bảng GDPR cho Flow 2 và Flow 3..."

# Đọc password nếu cần
read -sp "Nhập password PostgreSQL (nếu cần, Enter để bỏ qua): " PGPASSWORD
echo ""

if [ -n "$PGPASSWORD" ]; then
    export PGPASSWORD
fi

# Thử các cách kết nối
DB_USER="${DB_USER:-nguyen}"
DB_NAME="${DB_NAME:-document_management}"
DB_HOST="${DB_HOST:-localhost}"

echo "📝 Đang kết nối với: $DB_USER@$DB_HOST/$DB_NAME"

# Chạy SQL
psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" << 'SQL_EOF'
-- ============================================
-- SQL Schema cho Flow 2 và Flow 3
-- ============================================

-- Bảng 1: gdpr_compliance_results (Flow 2)
CREATE TABLE IF NOT EXISTS gdpr_compliance_results (
    id SERIAL PRIMARY KEY,
    processing_id VARCHAR(255) UNIQUE NOT NULL,
    audit_id VARCHAR(255),
    file_name VARCHAR(500),
    file_url TEXT,
    cloudinary_url TEXT,
    user_id VARCHAR(255),
    department VARCHAR(100),
    uploader VARCHAR(255),
    analysis_results JSONB,
    gdpr_decision VARCHAR(50),
    gdpr_justification TEXT,
    legal_basis VARCHAR(100),
    retention_days INTEGER DEFAULT 30,
    redaction_fields TEXT[],
    personal_data_found TEXT[],
    sensitive_data_detected BOOLEAN DEFAULT FALSE,
    data_volume VARCHAR(20),
    notify_dpo BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'gdpr_completed',
    gdpr_action_performed VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ai_decision_timestamp TIMESTAMP,
    gdpr_completed_at TIMESTAMP,
    workflow_source VARCHAR(100) DEFAULT 'flow2-gdpr-compliance',
    flow2_completed BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_gdpr_processing_id ON gdpr_compliance_results(processing_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_user_id ON gdpr_compliance_results(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_decision ON gdpr_compliance_results(gdpr_decision);
CREATE INDEX IF NOT EXISTS idx_gdpr_status ON gdpr_compliance_results(status);
CREATE INDEX IF NOT EXISTS idx_gdpr_created_at ON gdpr_compliance_results(created_at);

-- Bảng 2: document_sharing (Flow 3)
CREATE TABLE IF NOT EXISTS document_sharing (
    id SERIAL PRIMARY KEY,
    processing_id VARCHAR(255) NOT NULL,
    sharing_id VARCHAR(255) UNIQUE,
    file_name VARCHAR(500),
    file_url TEXT,
    cloudinary_url TEXT,
    docx_url TEXT,
    user_id VARCHAR(255),
    department VARCHAR(100),
    recipient_emails TEXT[],
    recipient_names TEXT[],
    sharing_method VARCHAR(50),
    share_link TEXT,
    access_level VARCHAR(50) DEFAULT 'viewer',
    gdpr_decision VARCHAR(50),
    gdpr_approved BOOLEAN DEFAULT FALSE,
    legal_basis VARCHAR(100),
    retention_days INTEGER,
    status VARCHAR(50) DEFAULT 'pending',
    sharing_status VARCHAR(50),
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP,
    email_subject TEXT,
    email_body TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sharing_requested_at TIMESTAMP,
    sharing_completed_at TIMESTAMP,
    workflow_source VARCHAR(100) DEFAULT 'flow3-document-sharing',
    flow3_completed BOOLEAN DEFAULT FALSE,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_sharing_processing_id ON document_sharing(processing_id);
CREATE INDEX IF NOT EXISTS idx_sharing_sharing_id ON document_sharing(sharing_id);
CREATE INDEX IF NOT EXISTS idx_sharing_user_id ON document_sharing(user_id);
CREATE INDEX IF NOT EXISTS idx_sharing_status ON document_sharing(status);
CREATE INDEX IF NOT EXISTS idx_sharing_gdpr_approved ON document_sharing(gdpr_approved);
CREATE INDEX IF NOT EXISTS idx_sharing_created_at ON document_sharing(created_at);

SELECT '✅ Đã tạo bảng gdpr_compliance_results' AS status;
SELECT '✅ Đã tạo bảng document_sharing' AS status;
SELECT '✅ Đã tạo tất cả indexes' AS status;
SQL_EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Hoàn thành! Đã tạo các bảng:"
    echo "   - gdpr_compliance_results (Flow 2)"
    echo "   - document_sharing (Flow 3)"
    echo ""
    echo "📊 Kiểm tra bảng đã tạo:"
    psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -c "\dt gdpr*"
    psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -c "\dt document_sharing"
else
    echo "❌ Có lỗi xảy ra. Vui lòng kiểm tra lại."
    exit 1
fi

unset PGPASSWORD

