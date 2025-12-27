#!/bin/bash

# Test webhook document-sharing của Flow 3
# URL: https://n8n.aidocmanageagent.io.vn/webhook-test/document-sharing

curl -X POST https://n8n.aidocmanageagent.io.vn/webhook-test/document-sharing \
  -H "Content-Type: application/json" \
  -d '{
    "processing_id": "test_processing_123",
    "processingId": "test_processing_123",
    "file_name": "test_document.pdf",
    "fileName": "test_document.pdf",
    "file_url": "https://example.com/files/test_document.pdf",
    "fileUrl": "https://example.com/files/test_document.pdf",
    "cloudinary_url": "https://res.cloudinary.com/example/image/upload/test_document.pdf",
    "cloudinaryUrl": "https://res.cloudinary.com/example/image/upload/test_document.pdf",
    "user_id": "user_123",
    "userId": "user_123",
    "department": "IT",
    "recipient_emails": [
      "danghongnguyen0175@gmail.com",
      "tranhaduy204@gmail.com",
      "congbui@gmail.com"
    ],
    "recipientEmails": [
      "danghongnguyen0175@gmail.com",
      "tranhaduy204@gmail.com",
      "congbui@gmail.com"
    ],
    "sharing_method": "email",
    "sharingMethod": "email",
    "access_level": "viewer",
    "accessLevel": "viewer",
    "gdpr_decision": "allow",
    "gdprDecision": "allow",
    "legal_basis": "Consent",
    "legalBasis": "Consent",
    "retention_days": 30,
    "retentionDays": 30,
    "gdpr_justification": "Tài liệu đã được kiểm tra và phù hợp với GDPR",
    "gdprJustification": "Tài liệu đã được kiểm tra và phù hợp với GDPR"
  }'

echo ""
echo ""
echo "✅ Test completed!"

