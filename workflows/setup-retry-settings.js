/**
 * Script hướng dẫn setup retry settings cho node AI trong n8n
 * 
 * Cách sử dụng:
 * 1. Mở workflow trong n8n
 * 2. Click vào node "comprehensive_analysis"
 * 3. Vào tab "Settings" (biểu tượng bánh răng ⚙️)
 * 4. Enable các settings sau:
 */

const retrySettings = {
  // Enable retry khi node fail
  errorHandling: {
    retry: {
      enabled: true,        // ✅ Bật retry
      maxRetries: 5,        // Retry tối đa 5 lần
      retryDelay: 10000    // Đợi 10 giây giữa mỗi retry
    }
  }
};

/**
 * Exponential Backoff Formula:
 * delay = baseDelay * (2 ^ attempt)
 * 
 * Attempt 1: 10s
 * Attempt 2: 20s
 * Attempt 3: 40s
 * Attempt 4: 80s
 * Attempt 5: 160s
 */

console.log('Retry Settings:');
console.log(JSON.stringify(retrySettings, null, 2));

console.log('\n📋 Hướng dẫn:');
console.log('1. Mở workflow trong n8n');
console.log('2. Click vào node "comprehensive_analysis"');
console.log('3. Vào tab "Settings" (⚙️)');
console.log('4. Enable "Retry on Fail"');
console.log('5. Max Retries: 5');
console.log('6. Retry Delay: 10000ms (10 giây)');
console.log('7. Lưu workflow');

module.exports = { retrySettings };

