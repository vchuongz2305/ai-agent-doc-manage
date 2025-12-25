// Test URL encoding với file có ký tự tiếng Việt
const http = require('http');
const https = require('https');
const path = require('path');

const fileName = '1764665251723-Thông_tin_Trần_hà_Duy.pdf';
const encodedFileName = encodeURIComponent(fileName);
const localUrl = `http://localhost:5000/uploads/${encodedFileName}`;
const domainUrl = `https://n8n.aidocmanageagent.io.vn/uploads/${encodedFileName}`;

console.log('🧪 Test URL Encoding');
console.log('='.repeat(60));
console.log(`Original filename: ${fileName}`);
console.log(`Encoded filename: ${encodedFileName}`);
console.log('');

// Test với backend trực tiếp
console.log('1️⃣ Test với Backend trực tiếp (localhost:5000):');
console.log(`   URL: ${localUrl}`);

http.get(localUrl, (res) => {
  console.log(`   Status: ${res.statusCode}`);
  console.log(`   Content-Type: ${res.headers['content-type'] || 'N/A'}`);
  
  if (res.statusCode === 200) {
    const contentType = res.headers['content-type'] || '';
    if (contentType.includes('application/pdf')) {
      console.log('   ✅ Backend trả về PDF thành công!');
    } else {
      console.log(`   ⚠️  Backend trả về ${contentType} (không phải PDF)`);
    }
  } else {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`   ❌ Lỗi: ${res.statusCode}`);
      try {
        const error = JSON.parse(data);
        console.log(`   Error details:`, JSON.stringify(error, null, 2));
      } catch (e) {
        console.log(`   Response: ${data.substring(0, 200)}`);
      }
    });
  }
}).on('error', (err) => {
  console.log(`   ❌ Connection error: ${err.message}`);
  console.log('   💡 Backend có thể không đang chạy');
});

setTimeout(() => {
  console.log('');
  console.log('2️⃣ Test với Domain qua Nginx:');
  console.log(`   URL: ${domainUrl}`);
  
  https.get(domainUrl, {
    rejectUnauthorized: false // Bỏ qua SSL certificate check
  }, (res) => {
    console.log(`   Status: ${res.statusCode}`);
    console.log(`   Content-Type: ${res.headers['content-type'] || 'N/A'}`);
    console.log(`   Content-Length: ${res.headers['content-length'] || 'N/A'}`);
    
    if (res.statusCode === 200) {
      const contentType = res.headers['content-type'] || '';
      if (contentType.includes('application/pdf')) {
        console.log('   ✅ Domain trả về PDF đúng!');
      } else if (contentType.includes('text/html')) {
        console.log('   ❌ Domain trả về HTML thay vì PDF!');
        console.log('   💡 Nginx có thể không proxy đúng hoặc backend không tìm thấy file');
        
        // Đọc một phần HTML để debug
        let htmlData = '';
        res.on('data', chunk => {
          if (htmlData.length < 500) {
            htmlData += chunk.toString();
          }
        });
        res.on('end', () => {
          if (htmlData.includes('404') || htmlData.includes('Not Found')) {
            console.log('   💡 Backend không tìm thấy file');
          } else if (htmlData.includes('nginx') || htmlData.includes('Nginx')) {
            console.log('   💡 Nginx trả về error page');
          }
        });
      } else {
        console.log(`   ⚠️  Domain trả về: ${contentType}`);
      }
    } else {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`   ❌ Lỗi: ${res.statusCode}`);
        try {
          const error = JSON.parse(data);
          console.log(`   Error details:`, JSON.stringify(error, null, 2));
        } catch (e) {
          console.log(`   Response (first 200 chars): ${data.substring(0, 200)}`);
        }
      });
    }
  }).on('error', (err) => {
    console.log(`   ❌ Connection error: ${err.message}`);
  });
}, 2000);

console.log('');
console.log('💡 Debugging tips:');
console.log('   1. Kiểm tra backend có đang chạy không: curl http://localhost:5000/api/health');
console.log('   2. Kiểm tra file có tồn tại không: ls -la uploads/ | grep 1764665251723');
console.log(`   3. Test trực tiếp với backend: curl -I "${localUrl}"`);
console.log(`   4. Test với Nginx: curl -I "${domainUrl}"`);

