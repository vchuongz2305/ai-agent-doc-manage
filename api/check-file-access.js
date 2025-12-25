const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Test file access
async function checkFileAccess() {
  const fileName = '1764654705627-Thông_tin_Trần_hà_Duy.pdf';
  const encodedFileName = encodeURIComponent(fileName);
  
  console.log('🔍 Kiểm tra truy cập file...\n');
  
  // 1. Check file exists on disk
  const filePath = path.join(__dirname, '..', 'uploads', fileName);
  const exists = fs.existsSync(filePath);
  console.log(`1️⃣ File trên disk: ${exists ? '✅ Tồn tại' : '❌ Không tồn tại'}`);
  if (exists) {
    const stats = fs.statSync(filePath);
    console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
  }
  
  // 2. Check localhost access
  console.log('\n2️⃣ Test localhost:5000...');
  try {
    const localUrl = `http://localhost:5000/uploads/${encodedFileName}`;
    const localResponse = await axios.head(localUrl, { timeout: 5000 });
    console.log(`   ✅ Truy cập được: ${localResponse.status} ${localResponse.statusText}`);
    console.log(`   Content-Type: ${localResponse.headers['content-type']}`);
  } catch (error) {
    console.log(`   ❌ Lỗi: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
    }
  }
  
  // 3. Check domain access
  console.log('\n3️⃣ Test domain: https://n8n.aidocmanageagent.io.vn...');
  try {
    const domainUrl = `https://n8n.aidocmanageagent.io.vn/uploads/${encodedFileName}`;
    const domainResponse = await axios.head(domainUrl, { 
      timeout: 10000,
      validateStatus: () => true // Don't throw on any status
    });
    console.log(`   Status: ${domainResponse.status} ${domainResponse.statusText}`);
    if (domainResponse.status === 200) {
      console.log(`   ✅ Truy cập được qua domain!`);
      console.log(`   Content-Type: ${domainResponse.headers['content-type']}`);
    } else if (domainResponse.status === 404) {
      console.log(`   ❌ 404 - File không tìm thấy qua domain`);
      console.log(`   💡 Cần setup Nginx reverse proxy để proxy /uploads/ đến localhost:5000`);
    } else {
      console.log(`   ⚠️  Status: ${domainResponse.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Lỗi: ${error.message}`);
    if (error.code === 'ENOTFOUND') {
      console.log(`   💡 Domain không resolve được hoặc chưa được cấu hình`);
    } else if (error.code === 'ECONNREFUSED') {
      console.log(`   💡 Không thể kết nối đến server`);
    }
  }
  
  // 4. Recommendations
  console.log('\n📋 Khuyến nghị:');
  if (exists) {
    console.log('   ✅ File tồn tại trên disk');
    console.log('   ✅ Backend có thể serve file qua localhost:5000');
    console.log('   ❌ Cần setup Nginx reverse proxy để expose /uploads/ qua domain');
    console.log('\n   Xem hướng dẫn: docs/N8N_DOMAIN_SETUP.md');
  }
}

checkFileAccess().catch(console.error);

