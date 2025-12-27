#!/bin/bash

# Script để tạo các bảng GDPR cho Flow 2 và Flow 3
# Sử dụng: ./setup_gdpr_tables.sh

set -e  # Dừng nếu có lỗi

echo "🚀 Bắt đầu tạo các bảng GDPR..."

# Thử các cách kết nối khác nhau
DB_USER="${DB_USER:-nguyen}"
DB_NAME="${DB_NAME:-document_management}"
DB_HOST="${DB_HOST:-localhost}"

# Cách 1: Thử với user hiện tại
echo "📝 Thử kết nối với user: $DB_USER"
if psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -f "$(dirname "$0")/create_gdpr_tables.sql" 2>/dev/null; then
    echo "✅ Tạo bảng thành công!"
    exit 0
fi

# Cách 2: Thử với sudo postgres
echo "📝 Thử kết nối với sudo postgres..."
if sudo -u postgres psql -d "$DB_NAME" -f "$(dirname "$0")/create_gdpr_tables.sql" 2>/dev/null; then
    echo "✅ Tạo bảng thành công!"
    exit 0
fi

# Cách 3: Thử với PGPASSWORD
echo "📝 Thử kết nối với PGPASSWORD..."
read -sp "Nhập password cho user $DB_USER: " DB_PASSWORD
echo ""
export PGPASSWORD="$DB_PASSWORD"

if psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -f "$(dirname "$0")/create_gdpr_tables.sql"; then
    echo "✅ Tạo bảng thành công!"
    unset PGPASSWORD
    exit 0
fi

unset PGPASSWORD

# Cách 4: Chạy trực tiếp SQL với sudo
echo "📝 Thử chạy SQL trực tiếp với sudo postgres..."
SQL_FILE="$(dirname "$0")/create_gdpr_tables.sql"
if sudo -u postgres psql -d "$DB_NAME" << EOF
$(cat "$SQL_FILE")
EOF
then
    echo "✅ Tạo bảng thành công!"
    exit 0
fi

echo "❌ Không thể tạo bảng. Vui lòng kiểm tra:"
echo "   1. Database '$DB_NAME' đã tồn tại chưa?"
echo "   2. User '$DB_USER' có quyền truy cập database không?"
echo "   3. PostgreSQL service đang chạy chưa?"
echo ""
echo "💡 Gợi ý: Thử chạy thủ công:"
echo "   sudo -u postgres psql -d $DB_NAME -f $(dirname "$0")/create_gdpr_tables.sql"
exit 1

