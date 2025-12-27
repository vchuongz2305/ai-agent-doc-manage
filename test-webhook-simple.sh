#!/bin/bash

# Test webhook document-sharing với dữ liệu đơn giản hơn
# URL: https://n8n.aidocmanageagent.io.vn/webhook-test/document-sharing

curl -X POST https://n8n.aidocmanageagent.io.vn/webhook-test/document-sharing \
  -H "Content-Type: application/json" \
  -d '{
    "processing_id": "test_123",
    "file_name": "test.pdf",
    "file_url": "https://example.com/test.pdf",
    "cloudinary_url": "https://res.cloudinary.com/test.pdf",
    "recipient_emails": "danghongnguyen0175@gmail.com,tranhaduy204@gmail.com",
    "gdpr_decision": "allow",
    "legal_basis": "Consent",
    "retention_days": 30
  }'

echo ""
echo "✅ Test completed!"

