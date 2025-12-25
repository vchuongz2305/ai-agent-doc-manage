/**
 * Script test kết nối Cloudinary
 * Kiểm tra credentials có hoạt động không
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

async function testCloudinaryConnection() {
  console.log('🔍 Testing Cloudinary connection...\n');
  
  // Kiểm tra credentials
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
  console.log('📋 Configuration:');
  console.log(`   Cloud Name: ${cloudName ? '✅ Set' : '❌ Missing'}`);
  console.log(`   API Key: ${apiKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`   API Secret: ${apiSecret ? '✅ Set (hidden)' : '❌ Missing'}`);
  console.log('');
  
  if (!cloudName || !apiKey || !apiSecret) {
    console.error('❌ Cloudinary credentials are missing!');
    console.error('   Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env file');
    process.exit(1);
  }
  
  // Test connection bằng cách ping API
  try {
    console.log('🔄 Testing API connection...');
    
    // Test bằng cách lấy thông tin account (ping API)
    const result = await cloudinary.api.ping();
    
    console.log('✅ Cloudinary connection successful!');
    console.log(`   Status: ${result.status}`);
    console.log('');
    
    // Test upload một file nhỏ (nếu có file test)
    const testFilePath = path.join(__dirname, '..', 'temp-downloaded.pdf');
    if (require('fs').existsSync(testFilePath)) {
      console.log('📤 Testing file upload...');
      console.log(`   File: ${testFilePath}`);
      
      const uploadResult = await cloudinary.uploader.upload(testFilePath, {
        public_id: 'test/connection-test',
        resource_type: 'auto',
        folder: 'test',
        overwrite: true
      });
      
      console.log('✅ File upload test successful!');
      console.log(`   Public ID: ${uploadResult.public_id}`);
      console.log(`   URL: ${uploadResult.secure_url}`);
      console.log('');
      
      // Xóa file test
      console.log('🗑️  Cleaning up test file...');
      // Xác định resource_type dựa trên format
      const resourceType = uploadResult.resource_type === 'raw' ? 'raw' : 'image';
      await cloudinary.uploader.destroy('test/connection-test', {
        resource_type: resourceType
      });
      console.log('✅ Test file deleted');
      
    } else {
      console.log('ℹ️  No test file found, skipping upload test');
      console.log('   To test upload, create a test file or use:');
      console.log('   node api/cloudinary-upload.js <filePath> <processingId> <fileName>');
    }
    
    console.log('');
    console.log('✅ All tests passed! Cloudinary is ready to use.');
    
  } catch (error) {
    console.error('❌ Cloudinary connection failed!');
    console.error(`   Error: ${error.message}`);
    
    if (error.http_code === 401) {
      console.error('');
      console.error('💡 This usually means:');
      console.error('   - API Key or API Secret is incorrect');
      console.error('   - Please check your credentials in Cloudinary Dashboard');
    } else if (error.http_code === 404) {
      console.error('');
      console.error('💡 This usually means:');
      console.error('   - Cloud Name is incorrect');
      console.error('   - Please check your Cloud Name in Cloudinary Dashboard');
    }
    
    process.exit(1);
  }
}

// Run test
testCloudinaryConnection().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

