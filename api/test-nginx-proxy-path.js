// Test để xem Nginx proxy path như thế nào
const http = require('http');

console.log('🔍 Test Nginx Proxy Path');
console.log('='.repeat(60));

// Test 1: Backend trực tiếp với /uploads/ path
console.log('\n1️⃣ Test backend trực tiếp với path /uploads/:');
const testUrl1 = 'http://localhost:5000/uploads/1764665251723-Th%C3%B4ng_tin_Tr%E1%BA%A7n_h%C3%A0_Duy.pdf';

http.get(testUrl1, (res) => {
  console.log(`   Status: ${res.statusCode}`);
  console.log(`   Content-Type: ${res.headers['content-type']}`);
  console.log(`   Request URL: ${testUrl1}`);
  
  if (res.statusCode === 200) {
    console.log('   ✅ Backend nhận được request đúng path!');
  }
}).on('error', (err) => {
  console.log(`   ❌ Error: ${err.message}`);
});

// Test 2: Kiểm tra backend route có hoạt động không
setTimeout(() => {
  console.log('\n2️⃣ Test với path khác để xem backend route:');
  const testUrl2 = 'http://localhost:5000/uploads/test.pdf';
  
  http.get(testUrl2, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`   Status: ${res.statusCode}`);
      if (res.statusCode === 404) {
        try {
          const error = JSON.parse(data);
          console.log(`   Error response:`, error);
          console.log(`   ✅ Route /uploads/:fileName(*) đang hoạt động!`);
        } catch (e) {
          console.log(`   Response: ${data.substring(0, 200)}`);
        }
      }
    });
  }).on('error', (err) => {
    console.log(`   ❌ Error: ${err.message}`);
  });
}, 1000);

console.log('\n💡 Phân tích:');
console.log('   - Nginx proxy_pass: http://localhost:5000/uploads/');
console.log('   - Backend route: /uploads/:fileName(*)');
console.log('   - Request đến Nginx: /uploads/1764665251723-Th%C3%B4ng...');
console.log('   - Request đến backend: /uploads/1764665251723-Th%C3%B4ng...');

