/**
 * Script để fix access mode của file trên Cloudinary
 * Sử dụng explicit API để force update access_mode thành public
 */

const path = require('path');
const cloudinary = require('cloudinary').v2;
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function fixFileAccess(publicId) {
  try {
    console.log('🔧 Đang fix access mode cho file...');
    console.log(`   Public ID: ${publicId}`);
    console.log('');
    
    // Dùng explicit API để update access_mode
    const result = await cloudinary.uploader.explicit(publicId, {
      resource_type: 'raw',
      type: 'upload',
      access_mode: 'public',
      overwrite: true,
      invalidate: true
    });
    
    console.log('✅ Fix thành công!');
    console.log('');
    console.log('📋 Thông tin mới:');
    console.log(`   Public ID: ${result.public_id}`);
    console.log(`   URL: ${result.secure_url}`);
    console.log(`   Access Mode: ${result.access_mode || 'public'}`);
    console.log('');
    
    return result;
    
  } catch (error) {
    console.error('❌ Lỗi khi fix:', error.message);
    
    if (error.http_code) {
      console.error(`   HTTP Code: ${error.http_code}`);
    }
    
    if (error.message.includes('not found')) {
      console.error('💡 File không tồn tại trên Cloudinary');
    }
    
    throw error;
  }
}

// Fix file vừa upload
const publicId = 'documents/doc_1766640648523_v6q8fkcpo/Th_ng_tin_Tr_n_h_Duy.pdf';

fixFileAccess(publicId)
  .then((result) => {
    console.log('🔗 Test URL:');
    console.log(`   ${result.secure_url}`);
    console.log('');
    console.log('✅ Hoàn thành!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  });

