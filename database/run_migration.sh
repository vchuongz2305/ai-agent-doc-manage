#!/bin/bash

# Script đơn giản để chạy migration với password
# Sử dụng: ./database/run_migration.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

DB_NAME=${1:-"document_management"}
DB_USER=${2:-"postgres"}

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Database Migration${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo -e "Database: ${GREEN}${DB_NAME}${NC}"
echo -e "User: ${GREEN}${DB_USER}${NC}"
echo ""

# Nhập password
echo -e "${YELLOW}Nhập password cho user $DB_USER:${NC}"
read -s PGPASSWORD
export PGPASSWORD

echo ""
echo -e "${YELLOW}Đang chạy migration...${NC}"
echo ""

# Chạy migration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_FILE="$SCRIPT_DIR/update_documents_schema.sql"

if psql -U "$DB_USER" -d "$DB_NAME" -h localhost -f "$MIGRATION_FILE"; then
    echo ""
    echo -e "${GREEN}✓ Migration thành công!${NC}"
    echo ""
    echo -e "${YELLOW}Kiểm tra schema:${NC}"
    psql -U "$DB_USER" -d "$DB_NAME" -h localhost -c "\d documents" 2>/dev/null || echo "Không thể hiển thị schema (có thể cần password lại)"
else
    echo ""
    echo -e "${RED}✗ Migration thất bại!${NC}"
    echo ""
    echo -e "${YELLOW}Các cách khác bạn có thể thử:${NC}"
    echo "  1. Sử dụng sudo: sudo -u postgres psql -d $DB_NAME -f $MIGRATION_FILE"
    echo "  2. Chạy trực tiếp: PGPASSWORD='your_password' psql -U $DB_USER -d $DB_NAME -h localhost -f $MIGRATION_FILE"
    exit 1
fi

# Xóa password khỏi environment
unset PGPASSWORD

