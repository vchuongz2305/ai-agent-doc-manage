// Test với Host header để match server_name
const http = require('http');

const fileName = '1764665251723-Thông_tin_Trần_hà_Duy.pdf';
const encodedFileName = encodeURIComponent(fileName);

console.log('🔍 Test với Host header (match server_name)');
console.log('='.repeat(60));
console.log(`File: ${fileName}`);
console.log(`Encoded: ${encodedFileName}`);
console.log('');

// Test với Host header
console.log('1️⃣ Test với Host header:');
const url = `http://127.0.0.1/uploads/${encodedFileName}`;
console.log(`   URL: ${url}`);
console.log(`   Host: n8n.aidocmanageagent.io.vn`);

const options = {
  hostname: '127.0.0.1',
  port: 80,
  path: `/uploads/${encodedFileName}`,
  method: 'GET',
  headers: {
    'Host': 'n8n.aidocmanageagent.io.vn'
  }
};

const req = http.request(options, (res) => {
  console.log(`   Status: ${res.statusCode}`);
  console.log(`   Content-Type: ${res.headers['content-type']}`);
  
  if (res.statusCode === 200 && res.headers['content-type']?.includes('application/pdf')) {
    console.log('   ✅ Nginx trả về PDF thành công!');
  } else {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (data.includes('Cannot GET')) {
        console.log('   ❌ Backend: "Cannot GET" - Route không match');
        console.log(`   Response: ${data.substring(0, 200)}`);
      } else if (data.includes('404 Not Found')) {
        console.log('   ❌ Nginx: 404 Not Found - Location không match');
      } else {
        console.log(`   Response: ${data.substring(0, 200)}`);
      }
    });
  }
});

req.on('error', (err) => {
  console.log(`   ❌ Error: ${err.message}`);
});

req.end();

console.log('\n💡 Giải thích:');
console.log('   - Nginx server block chỉ match khi server_name đúng');
console.log('   - Dùng Host header để match server_name');
console.log('   - Nếu vẫn lỗi, có thể là location /uploads/ không match');

