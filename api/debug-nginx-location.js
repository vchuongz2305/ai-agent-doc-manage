// Debug để xem Nginx location có match không
const http = require('http');

const testUrls = [
  'http://localhost:5000/uploads/1764665251723-Th%C3%B4ng_tin_Tr%E1%BA%A7n_h%C3%A0_Duy.pdf',
  'http://n8n.aidocmanageagent.io.vn/uploads/1764665251723-Th%C3%B4ng_tin_Tr%E1%BA%A7n_h%C3%A0_Duy.pdf',
  'http://n8n.aidocmanageagent.io.vn/uploads/test.pdf'
];

console.log('🔍 Debug Nginx Location Matching');
console.log('='.repeat(60));

testUrls.forEach((url, index) => {
  setTimeout(() => {
    console.log(`\n${index + 1}️⃣ Test: ${url}`);
    
    http.get(url, (res) => {
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Content-Type: ${res.headers['content-type']}`);
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 404) {
          if (data.includes('Cannot GET')) {
            console.log('   ❌ Backend Express: "Cannot GET" - Route không match!');
            console.log(`   Response: ${data.substring(0, 150)}`);
          } else {
            console.log(`   Response: ${data.substring(0, 150)}`);
          }
        } else if (res.statusCode === 200) {
          if (res.headers['content-type']?.includes('application/pdf')) {
            console.log('   ✅ Trả về PDF thành công!');
          } else {
            console.log(`   ⚠️  Trả về ${res.headers['content-type']}`);
          }
        }
      });
    }).on('error', (err) => {
      console.log(`   ❌ Error: ${err.message}`);
    });
  }, index * 500);
});

console.log('\n💡 Phân tích:');
console.log('   - Nginx location /uploads/ phải match trước location /');
console.log('   - proxy_pass http://localhost:5000/uploads/ sẽ gửi request đến backend');
console.log('   - Backend route: /uploads/:fileName(*)');
console.log('   - Nếu backend trả về "Cannot GET", route không match');

