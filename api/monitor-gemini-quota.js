/**
 * Script để monitor Google Gemini API quota và usage
 * 
 * Usage: node api/monitor-gemini-quota.js
 */

const https = require('https');

// Lấy API key từ environment hoặc config
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE';

/**
 * Check quota và usage từ Google Cloud Console
 * 
 * Note: Google không có public API để check quota trực tiếp
 * Phải check qua Google Cloud Console: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas
 */
function checkQuotaInfo() {
  console.log('📊 Google Gemini API Quota Information\n');
  console.log('⚠️  Google không cung cấp public API để check quota');
  console.log('📋 Vui lòng check thủ công tại:');
  console.log('   https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas\n');
  console.log('📈 Hoặc check usage tại:');
  console.log('   https://ai.google.dev/usage?tab=rate-limit\n');
  
  console.log('💡 Các quota quan trọng:');
  console.log('   - Requests per minute (RPM)');
  console.log('   - Requests per day (RPD)');
  console.log('   - Tokens per minute (TPM)');
  console.log('   - Tokens per day (TPD)\n');
}

/**
 * Test API key và check rate limit
 */
async function testAPIKey() {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
    console.log('❌ Chưa set GEMINI_API_KEY');
    console.log('   Set environment variable: export GEMINI_API_KEY=your_key');
    return;
  }

  console.log('🧪 Testing Google Gemini API key...\n');

  const testPrompt = {
    contents: [{
      parts: [{
        text: 'Hello, this is a test. Please respond with "OK".'
      }]
    }]
  };

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(testPrompt);
    
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ API key hoạt động tốt!');
          console.log('📊 Response:', JSON.parse(data).candidates[0].content.parts[0].text);
          resolve();
        } else if (res.statusCode === 429) {
          console.log('⚠️  Rate limit detected (429 Too Many Requests)');
          console.log('💡 Giải pháp:');
          console.log('   1. Thêm delay giữa các request');
          console.log('   2. Enable retry với exponential backoff');
          console.log('   3. Upgrade quota');
          reject(new Error('Rate limit'));
        } else if (res.statusCode === 403) {
          console.log('❌ API key không hợp lệ hoặc bị chặn');
          console.log('💡 Kiểm tra:');
          console.log('   1. API key có đúng không?');
          console.log('   2. API key có được enable chưa?');
          console.log('   3. Billing có được enable chưa?');
          reject(new Error('Invalid API key'));
        } else {
          console.log(`❌ Error: ${res.statusCode}`);
          console.log('Response:', data);
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Recommendations dựa trên error
 */
function showRecommendations() {
  console.log('\n💡 Recommendations để fix rate limit:\n');
  
  console.log('1. ✅ Combine AI nodes (Đã làm)');
  console.log('   - Từ 6-7 nodes → 1 node');
  console.log('   - Giảm 85% số request\n');
  
  console.log('2. ✅ Thêm delay trước AI node');
  console.log('   - Wait 5-10 giây trước mỗi request');
  console.log('   - File: workflows/Flow 1 - With Retry & Delay.json\n');
  
  console.log('3. ✅ Enable retry với exponential backoff');
  console.log('   - Max retries: 5');
  console.log('   - Retry delay: 10 giây');
  console.log('   - Exponential: 10s, 20s, 40s, 80s, 160s\n');
  
  console.log('4. ⚠️  Upgrade quota (nếu cần)');
  console.log('   - Vào Google Cloud Console');
  console.log('   - Request quota increase\n');
  
  console.log('5. ⚠️  Dùng multiple API keys');
  console.log('   - Tạo 2-3 keys khác nhau');
  console.log('   - Rotate keys khi một key bị limit\n');
  
  console.log('6. ⚠️  Implement caching');
  console.log('   - Lưu kết quả vào database');
  console.log('   - Reuse cho file tương tự\n');
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('🔍 Google Gemini API Quota Monitor');
  console.log('='.repeat(60));
  console.log();

  checkQuotaInfo();
  
  try {
    await testAPIKey();
  } catch (error) {
    console.log(`\n⚠️  Test failed: ${error.message}`);
  }
  
  showRecommendations();
  
  console.log('='.repeat(60));
  console.log('✅ Check hoàn tất!');
  console.log('='.repeat(60));
}

// Run nếu được gọi trực tiếp
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkQuotaInfo, testAPIKey, showRecommendations };

