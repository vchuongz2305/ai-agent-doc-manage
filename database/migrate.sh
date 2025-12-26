#!/bin/bash

# Script migration database cho workflow mới
# Sử dụng: ./database/migrate.sh [database_name] [username]

set -e

# Màu sắc cho output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Lấy thông tin database
DB_NAME=${1:-"document_management"}
DB_USER=${2:-"postgres"}

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Database Migration Script${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo -e "Database: ${GREEN}${DB_NAME}${NC}"
echo -e "User: ${GREEN}${DB_USER}${NC}"
echo ""

# Kiểm tra xem psql có sẵn không
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql không được tìm thấy. Vui lòng cài đặt PostgreSQL client.${NC}"
    exit 1
fi

# Kiểm tra kết nối database
echo -e "${YELLOW}Đang kiểm tra kết nối database...${NC}"
if ! psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
    echo -e "${RED}Error: Không thể kết nối đến database.${NC}"
    echo -e "${YELLOW}Vui lòng kiểm tra:${NC}"
    echo "  1. Database '$DB_NAME' đã tồn tại chưa?"
    echo "  2. User '$DB_USER' có quyền truy cập không?"
    echo "  3. PostgreSQL server đang chạy chưa?"
    exit 1
fi

echo -e "${GREEN}✓ Kết nối thành công!${NC}"
echo ""

# Chạy migration script
echo -e "${YELLOW}Đang chạy migration script...${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_FILE="$SCRIPT_DIR/update_documents_schema.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}Error: Không tìm thấy file migration: $MIGRATION_FILE${NC}"
    exit 1
fi

# Chạy migration
if psql -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"; then
    echo ""
    echo -e "${GREEN}✓ Migration thành công!${NC}"
    echo ""
    echo -e "${YELLOW}Kiểm tra schema:${NC}"
    psql -U "$DB_USER" -d "$DB_NAME" -c "\d documents"
    echo ""
    echo -e "${GREEN}Hoàn tất!${NC}"
else
    echo ""
    echo -e "${RED}✗ Migration thất bại!${NC}"
    exit 1
fi

