#!/bin/bash

# Script tự động setup PostgreSQL cho Document Management System
# Usage: ./setup-postgres.sh [database_name] [username] [password]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
DB_NAME="${1:-document_management}"
DB_USER="${2:-doc_user}"
DB_PASSWORD="${3:-}"

echo -e "${GREEN}🚀 PostgreSQL Setup Script${NC}"
echo "=================================="
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL is not installed!${NC}"
    echo "Please install PostgreSQL first:"
    echo "  Ubuntu/Debian: sudo apt install postgresql postgresql-contrib"
    echo "  CentOS/RHEL: sudo yum install postgresql-server postgresql-contrib"
    echo "  macOS: brew install postgresql@14"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL is installed${NC}"

# Check if PostgreSQL is running
if ! sudo systemctl is-active --quiet postgresql 2>/dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL service is not running. Starting...${NC}"
    sudo systemctl start postgresql
    sleep 2
fi

echo -e "${GREEN}✅ PostgreSQL service is running${NC}"

# Get password if not provided
if [ -z "$DB_PASSWORD" ]; then
    echo -e "${YELLOW}Enter password for user '$DB_USER':${NC}"
    read -s DB_PASSWORD
    echo ""
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SQL_DIR="$PROJECT_DIR/database"

# Check if SQL files exist
if [ ! -f "$SQL_DIR/create_documents_table.sql" ]; then
    echo -e "${RED}❌ SQL file not found: $SQL_DIR/create_documents_table.sql${NC}"
    exit 1
fi

echo -e "${GREEN}✅ SQL files found${NC}"

# Create database and user
echo ""
echo -e "${YELLOW}📝 Creating database and user...${NC}"

sudo -u postgres psql << EOF
-- Create database
CREATE DATABASE $DB_NAME;

-- Create user
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    END IF;
END
\$\$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

-- Connect to database and grant schema privileges
\c $DB_NAME
GRANT ALL ON SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database and user created successfully${NC}"
else
    echo -e "${RED}❌ Failed to create database/user${NC}"
    exit 1
fi

# Run SQL scripts
echo ""
echo -e "${YELLOW}📝 Running SQL scripts...${NC}"

# Create documents table
echo "  - Creating documents table..."
PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -d "$DB_NAME" -f "$SQL_DIR/create_documents_table.sql" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}  ✅ Documents table created${NC}"
else
    echo -e "${YELLOW}  ⚠️  Documents table might already exist (continuing...)${NC}"
fi

# Add docx_url column if script exists
if [ -f "$SQL_DIR/add_docx_url_column.sql" ]; then
    echo "  - Adding docx_url column..."
    PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -d "$DB_NAME" -f "$SQL_DIR/add_docx_url_column.sql" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✅ docx_url column added${NC}"
    else
        echo -e "${YELLOW}  ⚠️  docx_url column might already exist (continuing...)${NC}"
    fi
fi

# Verify setup
echo ""
echo -e "${YELLOW}🔍 Verifying setup...${NC}"

PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -d "$DB_NAME" -c "\dt" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Setup completed successfully!${NC}"
    echo ""
    echo "📋 Connection Information:"
    echo "  Host: localhost"
    echo "  Port: 5432"
    echo "  Database: $DB_NAME"
    echo "  User: $DB_USER"
    echo "  Password: [hidden]"
    echo ""
    echo "🧪 Test connection:"
    echo "  psql -U $DB_USER -d $DB_NAME -h localhost"
    echo ""
    echo "📊 View tables:"
    echo "  psql -U $DB_USER -d $DB_NAME -h localhost -c '\\dt'"
else
    echo -e "${RED}❌ Setup verification failed${NC}"
    exit 1
fi

