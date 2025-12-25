const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Test file URL access
async function testFileUrl() {
  const fileName = '1764659095362-Thông_tin_Trần_hà_Duy.pdf';
  const encodedFileName = encodeURIComponent(fileName);
  
  console.log('🔍 Test File URL Access');
  console.log('======================');
  console.log('');
  
  // 1. Check file exists
  const filePath = path.join(__dirname, '..', 'uploads', fileName);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log('1️⃣ File trên disk:');
    console.log(`   ✅ Tồn tại: ${(stats.size / 1024).toFixed(2)} KB`);
  } else {
    console.log('1️⃣ File trên disk:');
    console.log('   ❌ Không tồn tại!');
    return;
  }
  
  // 2. Test localhost
  console.log('');
  console.log('2️⃣ Test localhost:5000...');
  try {
    const localUrl = `http://localhost:5000/uploads/${encodedFileName}`;
    const response = await axios.head(localUrl, { timeout: 5000 });
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   ✅ Content-Type: ${response.headers['content-type']}`);
  } catch (error) {
    console.log(`   ❌ Lỗi: ${error.message}`);
  }
  
  // 3. Test domain
  console.log('');
  console.log('3️⃣ Test domain: https://n8n.aidocmanageagent.io.vn...');
  try {
    const domainUrl = `https://n8n.aidocmanageagent.io.vn/uploads/${encodedFileName}`;
    const response = await axios.head(domainUrl, { 
      timeout: 10000,
      validateStatus: () => true
    });
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers['content-type']}`);
    
    if (response.status === 200 && response.headers['content-type']?.includes('application/pdf')) {
      console.log('   ✅ Domain trả về PDF đúng!');
    } else if (response.status === 404) {
      console.log('   ❌ 404 - File không tìm thấy');
      console.log('   💡 Nginx chưa có location /uploads/ để proxy đến backend');
    } else if (response.headers['content-type']?.includes('text/html')) {
      console.log('   ❌ Trả về HTML thay vì PDF');
      console.log('   💡 Nginx đang proxy đến N8N thay vì backend');
    }
  } catch (error) {
    console.log(`   ❌ Lỗi: ${error.message}`);
    if (error.code === 'ENOTFOUND') {
      console.log('   💡 Domain không resolve được');
    }
  }
  
  // 4. Recommendations
  console.log('');
  console.log('📋 Khuyến nghị:');
  console.log('   1. Kiểm tra Nginx config có location /uploads/ chưa');
  console.log('   2. Nếu chưa có, thêm bằng: ./api/add-nginx-locations.sh');
  console.log('   3. Restart Nginx: sudo systemctl restart nginx');
  console.log('   4. Test lại domain');
}

testFileUrl().catch(console.error);
