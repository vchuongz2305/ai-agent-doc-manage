#!/bin/bash

# Script migration database với hỗ trợ nhiều phương thức authentication
# Sử dụng: ./database/migrate_with_auth.sh [database_name] [username] [method]

set -e

# Màu sắc cho output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Lấy thông tin database
DB_NAME=${1:-"document_management"}
DB_USER=${2:-"postgres"}
AUTH_METHOD=${3:-"auto"}

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Database Migration Script${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo -e "Database: ${GREEN}${DB_NAME}${NC}"
echo -e "User: ${GREEN}${DB_USER}${NC}"
echo -e "Auth Method: ${GREEN}${AUTH_METHOD}${NC}"
echo ""

# Kiểm tra xem psql có sẵn không
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql không được tìm thấy. Vui lòng cài đặt PostgreSQL client.${NC}"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_FILE="$SCRIPT_DIR/update_documents_schema.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}Error: Không tìm thấy file migration: $MIGRATION_FILE${NC}"
    exit 1
fi

# Hàm thử kết nối với các phương thức khác nhau
try_connection() {
    local method=$1
    local cmd=""
    
    case $method in
        "password")
            echo -e "${BLUE}Đang thử kết nối với password authentication...${NC}"
            export PGPASSWORD
            if [ -z "$PGPASSWORD" ]; then
                echo -e "${YELLOW}Nhập password cho user $DB_USER:${NC}"
                read -s PGPASSWORD
                export PGPASSWORD
            fi
            cmd="psql -U $DB_USER -d $DB_NAME -c 'SELECT 1;'"
            ;;
        "sudo")
            echo -e "${BLUE}Đang thử kết nối với sudo (peer authentication)...${NC}"
            cmd="sudo -u postgres psql -d $DB_NAME -c 'SELECT 1;'"
            ;;
        "local")
            echo -e "${BLUE}Đang thử kết nối với local socket...${NC}"
            cmd="psql -U $DB_USER -d $DB_NAME -h localhost -c 'SELECT 1;'"
            ;;
        "connection_string")
            echo -e "${BLUE}Đang thử kết nối với connection string...${NC}"
            if [ -z "$DATABASE_URL" ]; then
                echo -e "${YELLOW}Nhập connection string (postgresql://user:password@host:port/database):${NC}"
                read DATABASE_URL
            fi
            cmd="psql \"$DATABASE_URL\" -c 'SELECT 1;'"
            ;;
    esac
    
    if eval "$cmd" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Hàm chạy migration với phương thức cụ thể
run_migration() {
    local method=$1
    local cmd=""
    
    case $method in
        "password")
            cmd="psql -U $DB_USER -d $DB_NAME -f \"$MIGRATION_FILE\""
            ;;
        "sudo")
            cmd="sudo -u postgres psql -d $DB_NAME -f \"$MIGRATION_FILE\""
            ;;
        "local")
            cmd="psql -U $DB_USER -d $DB_NAME -h localhost -f \"$MIGRATION_FILE\""
            ;;
        "connection_string")
            cmd="psql \"$DATABASE_URL\" -f \"$MIGRATION_FILE\""
            ;;
    esac
    
    eval "$cmd"
}

# Tự động thử các phương thức
if [ "$AUTH_METHOD" = "auto" ]; then
    echo -e "${YELLOW}Đang tự động tìm phương thức authentication phù hợp...${NC}"
    echo ""
    
    # Thử các phương thức theo thứ tự
    METHODS=("password" "local" "sudo" "connection_string")
    
    for method in "${METHODS[@]}"; do
        if try_connection "$method"; then
            echo -e "${GREEN}✓ Tìm thấy phương thức: $method${NC}"
            echo ""
            echo -e "${YELLOW}Đang chạy migration...${NC}"
            if run_migration "$method"; then
                echo ""
                echo -e "${GREEN}✓ Migration thành công!${NC}"
                exit 0
            else
                echo ""
                echo -e "${RED}✗ Migration thất bại với phương thức $method${NC}"
                continue
            fi
        fi
    done
    
    echo -e "${RED}✗ Không thể kết nối với bất kỳ phương thức nào${NC}"
    echo ""
    echo -e "${YELLOW}Các phương thức bạn có thể thử:${NC}"
    echo "  1. Password: PGPASSWORD=your_password ./database/migrate_with_auth.sh $DB_NAME $DB_USER password"
    echo "  2. Sudo: ./database/migrate_with_auth.sh $DB_NAME $DB_USER sudo"
    echo "  3. Local: ./database/migrate_with_auth.sh $DB_NAME $DB_USER local"
    echo "  4. Connection String: DATABASE_URL='postgresql://...' ./database/migrate_with_auth.sh $DB_NAME $DB_USER connection_string"
    exit 1
else
    # Sử dụng phương thức được chỉ định
    if try_connection "$AUTH_METHOD"; then
        echo -e "${GREEN}✓ Kết nối thành công với phương thức: $AUTH_METHOD${NC}"
        echo ""
        echo -e "${YELLOW}Đang chạy migration...${NC}"
        if run_migration "$AUTH_METHOD"; then
            echo ""
            echo -e "${GREEN}✓ Migration thành công!${NC}"
            exit 0
        else
            echo ""
            echo -e "${RED}✗ Migration thất bại!${NC}"
            exit 1
        fi
    else
        echo -e "${RED}✗ Không thể kết nối với phương thức: $AUTH_METHOD${NC}"
        exit 1
    fi
fi

