#!/usr/bin/env python3
"""
Script để xóa HTTPS block chưa có SSL certificate
Chạy: python3 api/fix-nginx-remove-https.py
Sau đó: sudo cp /tmp/n8n-nginx-fixed.conf /etc/nginx/sites-available/n8n && sudo nginx -t && sudo systemctl reload nginx
"""

import re
import sys
from pathlib import Path

CONFIG_FILE = Path("/etc/nginx/sites-available/n8n")
OUTPUT_FILE = Path("/tmp/n8n-nginx-fixed.conf")

def read_config():
    """Đọc nginx config"""
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

def remove_https_without_ssl(config):
    """Xóa HTTPS server block chưa có SSL certificate"""
    
    # Tìm tất cả server blocks
    server_blocks = []
    in_server = False
    current_block = []
    brace_count = 0
    
    lines = config.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Bắt đầu server block
        if re.match(r'^\s*server\s*\{', line):
            if in_server:
                # Đã có server block đang mở, lưu lại
                server_blocks.append(('\n'.join(current_block), brace_count == 0))
                current_block = []
                brace_count = 0
            
            in_server = True
            current_block = [line]
            brace_count = line.count('{') - line.count('}')
            i += 1
            continue
        
        if in_server:
            current_block.append(line)
            brace_count += line.count('{') - line.count('}')
            
            # Kết thúc server block
            if brace_count == 0:
                server_blocks.append(('\n'.join(current_block), True))
                in_server = False
                current_block = []
        
        i += 1
    
    # Nếu còn block chưa đóng
    if current_block:
        server_blocks.append(('\n'.join(current_block), brace_count == 0))
    
    # Lọc và giữ lại các blocks
    filtered_blocks = []
    for block, is_complete in server_blocks:
        # Kiểm tra xem có phải HTTPS block không có SSL không
        if 'listen 443' in block or 'listen 443 ssl' in block:
            if 'ssl_certificate' not in block:
                print("   ⚠️  Tìm thấy HTTPS block chưa có SSL certificate, sẽ xóa...")
                continue
        
        if is_complete:
            filtered_blocks.append(block)
    
    # Ghép lại
    return '\n\n'.join(filtered_blocks) + '\n'

def main():
    print("🔧 Xóa HTTPS Block Chưa Có SSL Certificate")
    print("=" * 50)
    print()
    
    # Đọc config
    print(f"1️⃣ Đọc config từ: {CONFIG_FILE}")
    config = read_config()
    
    # Xóa HTTPS block chưa có SSL
    print("2️⃣ Xóa HTTPS block chưa có SSL certificate...")
    new_config = remove_https_without_ssl(config)
    
    # Ghi file mới
    print(f"3️⃣ Ghi config mới vào: {OUTPUT_FILE}")
    with open(OUTPUT_FILE, 'w') as f:
        f.write(new_config)
    print(f"   ✅ Đã tạo file config mới")
    print()
    
    # So sánh
    if config == new_config:
        print("✅ Config không thay đổi (không có HTTPS block chưa có SSL)")
    else:
        print("✅ Đã xóa HTTPS block chưa có SSL certificate")
    
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
    print("   5. Setup SSL với certbot (certbot sẽ tự động thêm HTTPS block):")
    print("      sudo certbot --nginx -d n8n.aidocmanageagent.io.vn")
    print()
    print("   Certbot sẽ tự động:")
    print("   - Tạo SSL certificate")
    print("   - Thêm HTTPS server block với location /api/")
    print("   - Reload nginx")

if __name__ == '__main__':
    main()

