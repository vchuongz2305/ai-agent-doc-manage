// Test trực tiếp với Nginx (không qua Cloudflare)
const http = require('http');
const os = require('os');

// Lấy IP local của server
const networkInterfaces = os.networkInterfaces();
let localIP = 'localhost';

// Tìm IP local đầu tiên (không phải loopback)
for (const name of Object.keys(networkInterfaces)) {
  for (const iface of networkInterfaces[name]) {
    if (iface.family === 'IPv4' && !iface.internal) {
      localIP = iface.address;
      break;
    }
  }
  if (localIP !== 'localhost') break;
}

const fileName = '1764665251723-Thông_tin_Trần_hà_Duy.pdf';
const encodedFileName = encodeURIComponent(fileName);

console.log('🔍 Test Nginx trực tiếp (không qua Cloudflare)');
console.log('='.repeat(60));
console.log(`Local IP: ${localIP}`);
console.log(`File: ${fileName}`);
console.log(`Encoded: ${encodedFileName}`);
console.log('');

// Test với localhost
console.log('1️⃣ Test với localhost (127.0.0.1):');
const localUrl = `http://127.0.0.1/uploads/${encodedFileName}`;
console.log(`   URL: ${localUrl}`);

http.get(localUrl, (res) => {
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
      } else {
        console.log(`   Response: ${data.substring(0, 150)}`);
      }
    });
  }
}).on('error', (err) => {
  console.log(`   ❌ Error: ${err.message}`);
});

// Test với local IP
setTimeout(() => {
  console.log('\n2️⃣ Test với local IP:');
  const ipUrl = `http://${localIP}/uploads/${encodedFileName}`;
  console.log(`   URL: ${ipUrl}`);
  console.log('   (Cần truy cập từ server, không qua Cloudflare)');
}, 1000);

console.log('\n💡 Giải thích:');
console.log('   - Domain đi qua Cloudflare proxy');
console.log('   - Test với localhost/IP để bypass Cloudflare');
console.log('   - Nếu localhost hoạt động, vấn đề nằm ở Cloudflare config');

