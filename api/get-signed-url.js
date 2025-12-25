/**
 * Tạo signed URL cho file trên Cloudinary
 * Signed URL sẽ bypass access control restrictions
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

const publicId = 'documents/doc_1766640648523_v6q8fkcpo/Th_ng_tin_Tr_n_h_Duy.pdf';

// Tạo signed URL
const signedUrl = cloudinary.url(publicId, {
  resource_type: 'raw',
  secure: true,
  sign_url: true,
  type: 'upload'
});

console.log('🔗 Signed URL (có thể download được):');
console.log('');
console.log(signedUrl);
console.log('');
console.log('📋 Thông tin:');
console.log(`   Public ID: ${publicId}`);
console.log(`   Resource Type: raw`);
console.log(`   Signed: true`);
console.log('');
console.log('💡 Signed URL sẽ bypass access control restrictions');
console.log('   Có thể dùng URL này trong n8n workflow để download file');

