// Test để so sánh HTTP vs HTTPS
const http = require('http');
const https = require('https');

const fileName = '1764665251723-Thông_tin_Trần_hà_Duy.pdf';
const encodedFileName = encodeURIComponent(fileName);

console.log('🔍 Test HTTP vs HTTPS');
console.log('='.repeat(60));
console.log(`File: ${fileName}`);
console.log(`Encoded: ${encodedFileName}`);
console.log('');

// Test HTTP
console.log('1️⃣ Test HTTP (port 80):');
const httpUrl = `http://n8n.aidocmanageagent.io.vn/uploads/${encodedFileName}`;
console.log(`   URL: ${httpUrl}`);

http.get(httpUrl, (res) => {
  console.log(`   Status: ${res.statusCode}`);
  console.log(`   Content-Type: ${res.headers['content-type']}`);
  console.log(`   Server: ${res.headers['server'] || 'N/A'}`);
  
  if (res.headers['content-type']?.includes('application/pdf')) {
    console.log('   ✅ HTTP trả về PDF đúng!');
  } else if (res.headers['content-type']?.includes('text/html')) {
    console.log('   ❌ HTTP trả về HTML (có thể đang proxy đến n8n thay vì backend)');
  }
}).on('error', (err) => {
  console.log(`   ❌ Error: ${err.message}`);
});

// Test HTTPS
setTimeout(() => {
  console.log('\n2️⃣ Test HTTPS (port 443):');
  const httpsUrl = `https://n8n.aidocmanageagent.io.vn/uploads/${encodedFileName}`;
  console.log(`   URL: ${httpsUrl}`);
  
  https.get(httpsUrl, {
    rejectUnauthorized: false
  }, (res) => {
    console.log(`   Status: ${res.statusCode}`);
    console.log(`   Content-Type: ${res.headers['content-type']}`);
    console.log(`   Server: ${res.headers['server'] || 'N/A'}`);
    
    if (res.headers['content-type']?.includes('application/pdf')) {
      console.log('   ✅ HTTPS trả về PDF đúng!');
    } else if (res.headers['content-type']?.includes('text/html')) {
      console.log('   ❌ HTTPS trả về HTML (có thể đang proxy đến n8n thay vì backend)');
    }
  }).on('error', (err) => {
    console.log(`   ❌ Error: ${err.message}`);
  });
}, 1000);

console.log('\n💡 Phân tích:');
console.log('   - Nginx config chỉ có HTTP (port 80)');
console.log('   - HTTPS có thể đi qua Cloudflare hoặc reverse proxy khác');
console.log('   - Nếu cả HTTP và HTTPS đều trả về HTML, location /uploads/ không match');

