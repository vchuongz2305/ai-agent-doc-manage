// Debug Nginx proxy để xem request được gửi như thế nào
const http = require('http');
const https = require('https');

const fileName = '1764665251723-Thông_tin_Trần_hà_Duy.pdf';
const encodedFileName = encodeURIComponent(fileName);
const url = `http://n8n.aidocmanageagent.io.vn/uploads/${encodedFileName}`;

console.log('🔍 Debug Nginx Proxy');
console.log('='.repeat(60));
console.log(`URL: ${url}`);
console.log('');

http.get(url, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('');
    console.log('Response body (first 500 chars):');
    console.log(data.substring(0, 500));
    
    if (data.includes('Cannot GET')) {
      console.log('');
      console.log('❌ Vấn đề: Nginx đang proxy đến sai location!');
      console.log('   Response: "Cannot GET /uploads/..."');
      console.log('');
      console.log('💡 Có thể:');
      console.log('   1. Nginx chưa reload config mới');
      console.log('   2. Location /uploads/ không match (có thể bị location / override)');
      console.log('   3. proxy_pass không đúng');
    }
  });
}).on('error', (err) => {
  console.log(`❌ Error: ${err.message}`);
});

