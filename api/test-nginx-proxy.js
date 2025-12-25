const axios = require('axios');
const http = require('http');

// Test Nginx proxy trực tiếp từ server
async function testNginxProxy() {
  const fileName = '1764659095362-Thông_tin_Trần_hà_Duy.pdf';
  const encodedFileName = encodeURIComponent(fileName);
  
  console.log('🔍 Test Nginx Proxy Directly');
  console.log('============================');
  console.log('');
  
  // Test 1: Direct HTTP request (bypass Cloudflare)
  console.log('1️⃣ Test HTTP (bypass Cloudflare)...');
  try {
    const httpUrl = `http://n8n.aidocmanageagent.io.vn/uploads/${encodedFileName}?t=${Date.now()}`;
    const response = await axios.get(httpUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      validateStatus: () => true,
      maxRedirects: 0,
      headers: {
        'Host': 'n8n.aidocmanageagent.io.vn',
        'Cache-Control': 'no-cache'
      }
    });
    
    const buf = Buffer.from(response.data);
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers['content-type']}`);
    console.log(`   Size: ${buf.length} bytes`);
    console.log(`   Is PDF: ${buf.slice(0, 4).toString() === '%PDF' ? '✅' : '❌'}`);
    
    if (buf.slice(0, 4).toString() === '%PDF') {
      console.log('   ✅ HTTP trả về PDF đúng!');
    } else {
      console.log('   ❌ HTTP vẫn trả về HTML');
    }
  } catch (error) {
    console.log(`   ⚠️  Error: ${error.message}`);
  }
  
  // Test 2: HTTPS với cache bypass
  console.log('');
  console.log('2️⃣ Test HTTPS với cache bypass...');
  try {
    const httpsUrl = `https://n8n.aidocmanageagent.io.vn/uploads/${encodedFileName}?nocache=${Date.now()}`;
    const response = await axios.get(httpsUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      validateStatus: () => true,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    const buf = Buffer.from(response.data);
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers['content-type']}`);
    console.log(`   Size: ${buf.length} bytes`);
    console.log(`   Is PDF: ${buf.slice(0, 4).toString() === '%PDF' ? '✅' : '❌'}`);
    
    if (buf.slice(0, 4).toString() === '%PDF') {
      console.log('   ✅ HTTPS trả về PDF đúng!');
    } else {
      console.log('   ❌ HTTPS vẫn trả về HTML');
      console.log('   💡 Có thể Cloudflare đang cache');
    }
  } catch (error) {
    console.log(`   ⚠️  Error: ${error.message}`);
  }
  
  console.log('');
  console.log('📋 Khuyến nghị:');
  console.log('   1. Kiểm tra lại Nginx config: ./api/check-and-fix-nginx.sh');
  console.log('   2. Clear Cloudflare cache (nếu dùng Cloudflare)');
  console.log('   3. Test với file mới upload');
  console.log('   4. Kiểm tra Nginx access log: sudo tail -f /var/log/nginx/access.log');
}

testNginxProxy().catch(console.error);

