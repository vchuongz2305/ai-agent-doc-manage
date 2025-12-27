#!/bin/bash

echo "🧪 Testing /gdpr endpoint..."
echo ""

# Test endpoint
echo "1. Testing GET /gdpr..."
curl -s http://localhost:5000/gdpr?limit=5 | jq '.' || echo "❌ Endpoint không hoạt động hoặc server chưa restart"

echo ""
echo "2. Testing GET /gdpr với has_analysis=true..."
curl -s "http://localhost:5000/gdpr?limit=5&has_analysis=true" | jq '.' || echo "❌ Endpoint không hoạt động"

echo ""
echo "✅ Test hoàn tất!"
echo ""
echo "💡 Nếu endpoint không hoạt động, hãy restart server:"
echo "   - Tìm process: ps aux | grep unified-document-agent"
echo "   - Kill process: kill <PID>"
echo "   - Restart: node api/unified-document-agent.js"

