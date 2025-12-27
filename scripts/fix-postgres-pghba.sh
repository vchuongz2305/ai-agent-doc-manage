#!/bin/bash

# Script to fix PostgreSQL pg_hba.conf to allow connections

echo "🔧 Fixing PostgreSQL pg_hba.conf configuration..."

# Find PostgreSQL version and config directory
PG_VERSION=$(psql --version 2>/dev/null | grep -oP '\d+' | head -1)
if [ -z "$PG_VERSION" ]; then
    echo "❌ PostgreSQL not found. Please install PostgreSQL first."
    exit 1
fi

echo "📊 PostgreSQL version: $PG_VERSION"

# Common pg_hba.conf locations
PG_HBA_LOCATIONS=(
    "/etc/postgresql/$PG_VERSION/main/pg_hba.conf"
    "/var/lib/pgsql/$PG_VERSION/data/pg_hba.conf"
    "/usr/local/pgsql/data/pg_hba.conf"
    "$HOME/postgresql/data/pg_hba.conf"
)

PG_HBA_FILE=""
for location in "${PG_HBA_LOCATIONS[@]}"; do
    if [ -f "$location" ]; then
        PG_HBA_FILE="$location"
        echo "✅ Found pg_hba.conf at: $PG_HBA_FILE"
        break
    fi
done

if [ -z "$PG_HBA_FILE" ]; then
    echo "❌ Could not find pg_hba.conf file"
    echo "💡 Please find it manually: sudo find / -name pg_hba.conf 2>/dev/null"
    exit 1
fi

# Backup original file
BACKUP_FILE="${PG_HBA_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
echo "📋 Creating backup: $BACKUP_FILE"
sudo cp "$PG_HBA_FILE" "$BACKUP_FILE"

# Get current IP address
CURRENT_IP=$(hostname -I | awk '{print $1}')
echo "📡 Current IP: $CURRENT_IP"

# Check if entry already exists
if grep -q "$CURRENT_IP" "$PG_HBA_FILE"; then
    echo "⚠️  Entry for $CURRENT_IP already exists in pg_hba.conf"
    echo "📝 Current entry:"
    grep "$CURRENT_IP" "$PG_HBA_FILE"
    read -p "Do you want to add another entry? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "✅ Keeping existing configuration"
        exit 0
    fi
fi

# Add entry for IPv4 connections
echo ""
echo "➕ Adding entry to pg_hba.conf..."
echo "   This will allow connections from $CURRENT_IP"

# Add entry for the current IP
ENTRY="host    all             all             $CURRENT_IP/32            md5"
echo "$ENTRY" | sudo tee -a "$PG_HBA_FILE" > /dev/null

# Also add localhost entry if not exists
if ! grep -q "host.*all.*all.*127.0.0.1" "$PG_HBA_FILE"; then
    echo "➕ Adding localhost entry..."
    echo "host    all             all             127.0.0.1/32            md5" | sudo tee -a "$PG_HBA_FILE" > /dev/null
fi

# Also add IPv6 localhost if not exists
if ! grep -q "host.*all.*all.*::1" "$PG_HBA_FILE"; then
    echo "➕ Adding IPv6 localhost entry..."
    echo "host    all             all             ::1/128                 md5" | sudo tee -a "$PG_HBA_FILE" > /dev/null
fi

echo ""
echo "✅ Configuration updated!"
echo ""
echo "📋 New entries added:"
tail -3 "$PG_HBA_FILE"

echo ""
echo "🔄 Reloading PostgreSQL configuration..."
sudo systemctl reload postgresql

if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL configuration reloaded successfully"
else
    echo "⚠️  Could not reload PostgreSQL. You may need to restart:"
    echo "   sudo systemctl restart postgresql"
fi

echo ""
echo "🧪 Testing connection..."
if PGPASSWORD="${POSTGRES_PASSWORD:-}" psql -h localhost -U "${POSTGRES_USER:-doc_user}" -d "${POSTGRES_DATABASE:-document_management}" -c "SELECT NOW();" &>/dev/null; then
    echo "✅ Connection test successful!"
else
    echo "⚠️  Connection test failed. Please check:"
    echo "   1. PostgreSQL user and password in .env file"
    echo "   2. Database exists: psql -U postgres -c '\\l'"
    echo "   3. User has permissions: psql -U postgres -c '\\du'"
fi

echo ""
echo "📝 Note: If you're connecting from a different IP, you may need to:"
echo "   1. Add that IP to pg_hba.conf"
echo "   2. Or use '0.0.0.0/0' for all IPs (less secure)"
echo "   3. Or use 'host    all    all    0.0.0.0/0    md5' for all IPv4 connections"

