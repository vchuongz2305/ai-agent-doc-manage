#!/usr/bin/env python3
"""
Script để thêm HTTPS server block vào nginx config
Chạy: python3 api/add-nginx-https.py
Sau đó: sudo cp /tmp/n8n-nginx-new.conf /etc/nginx/sites-available/n8n
"""

import re
import sys
from pathlib import Path

CONFIG_FILE = Path("/etc/nginx/sites-available/n8n")
OUTPUT_FILE = Path("/tmp/n8n-nginx-new.conf")
BACKUP_FILE = Path(f"/tmp/n8n-nginx-backup-{Path(__file__).stat().st_mtime:.0f}.conf")

def read_config():
    """Đọc nginx config hiện tại"""
    try:
        with open(CONFIG_FILE, 'r') as f:
            return f.read()
    except PermissionError:
        print("❌ Không có quyền đọc file. Chạy với sudo:")
        print(f"   sudo python3 {sys.argv[0]}")
        sys.exit(1)
    except FileNotFoundError:
        print(f"❌ File không tồn tại: {CONFIG_FILE}")
        sys.exit(1)

def has_https_block(config):
    """Kiểm tra xem đã có HTTPS server block chưa"""
    return 'listen 443' in config

def add_https_block(config):
    """Thêm HTTPS server block vào config"""
    
    # Tìm vị trí cuối của HTTP server block
    http_block_end = config.rfind('}')
    
    if http_block_end == -1:
        print("❌ Không tìm thấy server block HTTP")
        return None
    
    # Tạo HTTPS server block
    https_block = """
# HTTPS Server Block
server {
    listen 443 ssl http2;
    server_name n8n.aidocmanageagent.io.vn;

    # SSL Configuration (sẽ được certbot tự động thêm khi chạy: sudo certbot --nginx -d n8n.aidocmanageagent.io.vn)
    # ssl_certificate /etc/letsencrypt/live/n8n.aidocmanageagent.io.vn/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/n8n.aidocmanageagent.io.vn/privkey.pem;
    # include /etc/letsencrypt/options-ssl-nginx.conf;
    # ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Proxy /uploads/ đến Backend
    location /uploads/ {
        proxy_pass http://localhost:5000/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Proxy /api/ đến Backend (QUAN TRỌNG: phải đứng TRƯỚC location /)
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy tất cả requests khác đến N8N
    location / {
        proxy_pass http://127.0.0.1:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
"""
    
    # Chèn HTTPS block sau HTTP block
    new_config = config[:http_block_end+1] + https_block + config[http_block_end+1:]
    
    return new_config

def main():
    print("🔧 Thêm HTTPS Server Block vào Nginx Config")
    print("=" * 50)
    print()
    
    # Đọc config hiện tại
    print(f"1️⃣ Đọc config từ: {CONFIG_FILE}")
    config = read_config()
    
    # Backup
    print(f"2️⃣ Backup config đến: {BACKUP_FILE}")
    with open(BACKUP_FILE, 'w') as f:
        f.write(config)
    print(f"   ✅ Đã backup")
    print()
    
    # Kiểm tra đã có HTTPS block chưa
    if has_https_block(config):
        print("⚠️  Đã có HTTPS server block trong config!")
        print("   Kiểm tra xem location /api/ có đúng không...")
        
        # Kiểm tra location /api/ trong HTTPS block
        https_section = re.search(r'listen 443.*?^}', config, re.MULTILINE | re.DOTALL)
        if https_section:
            if 'location /api/' in https_section.group():
                print("   ✅ Đã có location /api/ trong HTTPS block")
                print()
                print("✅ Config đã đúng, không cần sửa!")
                return
            else:
                print("   ❌ Chưa có location /api/ trong HTTPS block")
                print("   💡 Bạn cần thêm location /api/ vào HTTPS server block thủ công")
                return
        else:
            print("   ⚠️  Không tìm thấy HTTPS server block section")
    
    # Thêm HTTPS block
    print("3️⃣ Thêm HTTPS server block...")
    new_config = add_https_block(config)
    
    if new_config is None:
        print("   ❌ Không thể thêm HTTPS block")
        return
    
    # Ghi file mới
    print(f"4️⃣ Ghi config mới vào: {OUTPUT_FILE}")
    with open(OUTPUT_FILE, 'w') as f:
        f.write(new_config)
    print(f"   ✅ Đã tạo file config mới")
    print()
    
    print("✅ Hoàn thành!")
    print()
    print("📋 Bước tiếp theo:")
    print("   1. Kiểm tra config mới:")
    print(f"      cat {OUTPUT_FILE}")
    print()
    print("   2. Test config:")
    print("      sudo nginx -t")
    print()
    print("   3. Nếu OK, copy vào nginx config:")
    print(f"      sudo cp {OUTPUT_FILE} {CONFIG_FILE}")
    print()
    print("   4. Reload nginx:")
    print("      sudo systemctl reload nginx")
    print()
    print("   5. Setup SSL (nếu chưa có):")
    print("      sudo certbot --nginx -d n8n.aidocmanageagent.io.vn")
    print()
    print("   6. Test API:")
    print("      curl https://n8n.aidocmanageagent.io.vn/api/document/get-from-postgres/doc_1766741636080_ubk9wvp5u")

if __name__ == '__main__':
    main()

