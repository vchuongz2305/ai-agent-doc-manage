#!/bin/bash

# Script to check PostgreSQL status and provide troubleshooting steps

echo "🔍 Checking PostgreSQL status..."

# Check if PostgreSQL service is running
if systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL service is running"
    SERVICE_STATUS="running"
else
    echo "❌ PostgreSQL service is NOT running"
    SERVICE_STATUS="stopped"
fi

# Check if PostgreSQL is listening on port 5432
if netstat -tuln 2>/dev/null | grep -q ":5432 " || ss -tuln 2>/dev/null | grep -q ":5432 "; then
    echo "✅ PostgreSQL is listening on port 5432"
    PORT_STATUS="listening"
else
    echo "⚠️  PostgreSQL is NOT listening on port 5432"
    PORT_STATUS="not_listening"
fi

# Try to connect to PostgreSQL
if command -v psql &> /dev/null; then
    echo ""
    echo "🔍 Testing PostgreSQL connection..."
    
    # Try to connect (will use default credentials or environment variables)
    if PGPASSWORD="${POSTGRES_PASSWORD:-}" psql -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-doc_user}" -d "${POSTGRES_DATABASE:-document_management}" -c "SELECT NOW();" &>/dev/null; then
        echo "✅ PostgreSQL connection successful"
        CONNECTION_STATUS="success"
    else
        echo "❌ PostgreSQL connection failed"
        CONNECTION_STATUS="failed"
    fi
else
    echo "⚠️  psql command not found - cannot test connection"
    CONNECTION_STATUS="unknown"
fi

echo ""
echo "📊 Summary:"
echo "   Service: $SERVICE_STATUS"
echo "   Port: $PORT_STATUS"
echo "   Connection: $CONNECTION_STATUS"

echo ""
if [ "$SERVICE_STATUS" != "running" ]; then
    echo "💡 To start PostgreSQL:"
    echo "   sudo systemctl start postgresql"
    echo "   sudo systemctl enable postgresql"
    echo ""
fi

if [ "$CONNECTION_STATUS" = "failed" ]; then
    echo "💡 Troubleshooting steps:"
    echo "   1. Check PostgreSQL credentials in .env file:"
    echo "      POSTGRES_HOST=localhost"
    echo "      POSTGRES_PORT=5432"
    echo "      POSTGRES_DATABASE=document_management"
    echo "      POSTGRES_USER=doc_user"
    echo "      POSTGRES_PASSWORD=your_password"
    echo ""
    echo "   2. Test connection manually:"
    echo "      psql -h localhost -U doc_user -d document_management"
    echo ""
    echo "   3. Check PostgreSQL logs:"
    echo "      sudo journalctl -u postgresql -n 50"
    echo ""
fi

echo ""
echo "🌐 Check API health endpoint:"
echo "   curl http://localhost:5000/api/health/postgres"

