/**
 * Script để upload file cụ thể lên Cloudinary
 * Sử dụng để upload file "Thông tin Trần hà Duy.pdf"
 */

const path = require('path');
const { uploadFileToCloudinary } = require('./cloudinary-upload');

async function uploadSpecificFile() {
  try {
    // Đường dẫn file cần upload
    const filePath = path.join(__dirname, '..', 'Thông tin Trần hà Duy.pdf');
    const fileName = 'Thông tin Trần hà Duy.pdf';
    
    // Tạo processing ID
    const processingId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('📤 Bắt đầu upload file lên Cloudinary...');
    console.log(`   File: ${filePath}`);
    console.log(`   Processing ID: ${processingId}`);
    console.log('');
    
    // Upload file
    const result = await uploadFileToCloudinary(filePath, processingId, fileName);
    
    console.log('');
    console.log('='.repeat(60));
    console.log('✅ UPLOAD THÀNH CÔNG!');
    console.log('='.repeat(60));
    console.log('');
    console.log('📋 Thông tin file:');
    console.log(`   Public ID: ${result.public_id}`);
    console.log(`   URL: ${result.secure_url}`);
    console.log(`   Size: ${(result.bytes / 1024).toFixed(2)} KB`);
    console.log(`   Format: ${result.format || 'PDF'}`);
    console.log(`   Resource Type: ${result.resource_type}`);
    console.log(`   Access Mode: ${result.access_mode || 'public'}`);
    console.log('');
    console.log('🔗 Link để download:');
    console.log(`   ${result.secure_url}`);
    console.log('');
    
    // Test download URL
    console.log('🧪 Testing URL access...');
    const https = require('https');
    const url = require('url');
    
    const urlObj = new URL(result.secure_url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    };
    
    https.get(result.secure_url, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ URL có thể truy cập được!');
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Content-Type: ${res.headers['content-type']}`);
      } else {
        console.log(`⚠️  URL trả về status: ${res.statusCode}`);
      }
    }).on('error', (err) => {
      console.log(`⚠️  Lỗi khi test URL: ${err.message}`);
      console.log('   (Có thể do network hoặc Cloudinary settings)');
    });
    
    return result;
    
  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ UPLOAD THẤT BẠI!');
    console.error('='.repeat(60));
    console.error('');
    console.error('Lỗi:', error.message);
    console.error('');
    
    if (error.message.includes('untrusted')) {
      console.error('💡 Hướng dẫn fix:');
      console.error('   1. Vào Cloudinary Dashboard → Settings → Security');
      console.error('   2. Tắt "Block untrusted customers" (nếu có)');
      console.error('   3. Hoặc tạo Unsigned Upload Preset');
      console.error('   4. Hoặc liên hệ Cloudinary support');
      console.error('');
    }
    
    if (error.message.includes('not found')) {
      console.error('💡 File không tồn tại!');
      console.error('   Kiểm tra đường dẫn file');
      console.error('');
    }
    
    process.exit(1);
  }
}

// Chạy script
if (require.main === module) {
  uploadSpecificFile()
    .then(() => {
      console.log('');
      console.log('✅ Hoàn thành!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Lỗi:', error);
      process.exit(1);
    });
}

module.exports = { uploadSpecificFile };

