/**
 * Test download file từ Cloudinary URL
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testDownload() {
  const testUrl = 'https://res.cloudinary.com/diaogiqvy/raw/upload/v1766633784/documents/test_1766633781983/test-document.pdf';
  
  console.log('🧪 Testing download from Cloudinary URL...\n');
  console.log(`URL: ${testUrl}\n`);
  
  try {
    console.log('📥 Downloading file...');
    const response = await axios({
      method: 'GET',
      url: testUrl,
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    const buffer = Buffer.from(response.data);
    console.log(`✅ Download successful!`);
    console.log(`   Size: ${buffer.length} bytes`);
    console.log(`   Content-Type: ${response.headers['content-type']}`);
    
    // Lưu file để test
    const outputPath = path.join(__dirname, '..', 'test-downloaded-from-cloudinary.pdf');
    fs.writeFileSync(outputPath, buffer);
    console.log(`   Saved to: ${outputPath}`);
    
    // Kiểm tra file có phải PDF không
    if (buffer.toString('ascii', 0, 4) === '%PDF') {
      console.log('✅ File is valid PDF!');
    } else {
      console.log('⚠️  File might not be a valid PDF');
    }
    
  } catch (error) {
    console.error('❌ Download failed!');
    console.error(`   Error: ${error.message}`);
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Status Text: ${error.response.statusText}`);
    }
  }
}

testDownload();

