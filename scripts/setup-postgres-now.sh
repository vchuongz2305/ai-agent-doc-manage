#!/bin/bash

# Script setup PostgreSQL ngay lập tức
# Chạy: bash scripts/setup-postgres-now.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 PostgreSQL Setup Script${NC}"
echo "=================================="
echo ""

# Check PostgreSQL version
echo -e "${YELLOW}📋 Checking PostgreSQL...${NC}"
if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql --version | awk '{print $3}')
    echo -e "${GREEN}✅ PostgreSQL $PSQL_VERSION is installed${NC}"
else
    echo -e "${RED}❌ PostgreSQL is not installed${NC}"
    echo "Installing PostgreSQL..."
    sudo apt update
    sudo apt install -y postgresql postgresql-contrib
fi

# Start PostgreSQL service
echo ""
echo -e "${YELLOW}🔄 Starting PostgreSQL service...${NC}"
sudo systemctl start postgresql
sudo systemctl enable postgresql
sleep 2

if sudo systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}✅ PostgreSQL service is running${NC}"
else
    echo -e "${RED}❌ Failed to start PostgreSQL${NC}"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SQL_DIR="$PROJECT_DIR/database"

# Database configuration
DB_NAME="document_management"
DB_USER="doc_user"

echo ""
echo -e "${YELLOW}📝 Setting up database...${NC}"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Get password
echo -e "${YELLOW}Enter password for user '$DB_USER':${NC}"
read -s DB_PASSWORD
echo ""

# Create database and user
echo -e "${YELLOW}Creating database and user...${NC}"
sudo -u postgres psql << EOF
-- Create database
SELECT 'CREATE DATABASE $DB_NAME' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Create user
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    ELSE
        ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
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
if [ -f "$SQL_DIR/create_documents_table.sql" ]; then
    echo "  - Creating documents table..."
    PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -d "$DB_NAME" -h localhost -f "$SQL_DIR/create_documents_table.sql" 2>&1 | grep -v "already exists" || true
    echo -e "${GREEN}  ✅ Documents table created${NC}"
else
    echo -e "${RED}  ❌ SQL file not found: $SQL_DIR/create_documents_table.sql${NC}"
fi

# Add docx_url column
if [ -f "$SQL_DIR/add_docx_url_column.sql" ]; then
    echo "  - Adding docx_url column..."
    PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -d "$DB_NAME" -h localhost -f "$SQL_DIR/add_docx_url_column.sql" 2>&1 | grep -v "already exists" || true
    echo -e "${GREEN}  ✅ docx_url column added${NC}"
fi

# Verify setup
echo ""
echo -e "${YELLOW}🔍 Verifying setup...${NC}"

PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -d "$DB_NAME" -h localhost -c "\dt" > /dev/null 2>&1

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
    echo "  PGPASSWORD='$DB_PASSWORD' psql -U $DB_USER -d $DB_NAME -h localhost"
    echo ""
    echo "📊 View tables:"
    echo "  PGPASSWORD='$DB_PASSWORD' psql -U $DB_USER -d $DB_NAME -h localhost -c '\\dt'"
    echo ""
    echo -e "${GREEN}✅ PostgreSQL is ready to use!${NC}"
else
    echo -e "${RED}❌ Setup verification failed${NC}"
    exit 1
fi

