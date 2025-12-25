/**
 * Script để rotate Google Gemini API keys khi một key bị rate limit
 * 
 * Usage: 
 *   node api/rotate-api-keys.js
 * 
 * Environment variables:
 *   GEMINI_API_KEY_1=key1
 *   GEMINI_API_KEY_2=key2
 *   GEMINI_API_KEY_3=key3
 */

/**
 * Lấy danh sách API keys từ environment
 */
function getAPIKeys() {
  const keys = [];
  
  // Lấy tối đa 5 keys
  for (let i = 1; i <= 5; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key) {
      keys.push({
        index: i,
        key: key,
        lastUsed: null,
        errorCount: 0,
        isBlocked: false
      });
    }
  }
  
  // Nếu không có, dùng key mặc định
  if (keys.length === 0 && process.env.GEMINI_API_KEY) {
    keys.push({
      index: 0,
      key: process.env.GEMINI_API_KEY,
      lastUsed: null,
      errorCount: 0,
      isBlocked: false
    });
  }
  
  return keys;
}

/**
 * Chọn API key tốt nhất (round-robin hoặc dựa trên error count)
 */
function selectBestKey(keys, processingId = null) {
  if (keys.length === 0) {
    throw new Error('No API keys available');
  }
  
  if (keys.length === 1) {
    return keys[0];
  }
  
  // Strategy 1: Round-robin dựa trên processingId
  if (processingId) {
    const hash = parseInt(processingId.slice(-1)) || 0;
    const index = hash % keys.length;
    return keys[index];
  }
  
  // Strategy 2: Chọn key ít lỗi nhất và không bị block
  const availableKeys = keys.filter(k => !k.isBlocked);
  if (availableKeys.length === 0) {
    // Nếu tất cả đều bị block, reset và dùng lại
    keys.forEach(k => {
      k.isBlocked = false;
      k.errorCount = 0;
    });
    return keys[0];
  }
  
  // Chọn key có errorCount thấp nhất
  return availableKeys.reduce((best, current) => {
    return current.errorCount < best.errorCount ? current : best;
  });
}

/**
 * Mark key là blocked sau khi gặp rate limit
 */
function markKeyAsBlocked(keys, keyIndex) {
  const key = keys.find(k => k.index === keyIndex);
  if (key) {
    key.isBlocked = true;
    key.errorCount++;
    key.lastUsed = new Date();
    console.log(`⚠️  API Key ${keyIndex} marked as blocked (error count: ${key.errorCount})`);
  }
}

/**
 * Reset key sau một khoảng thời gian
 */
function resetKeyIfNeeded(keys, keyIndex, cooldownMinutes = 60) {
  const key = keys.find(k => k.index === keyIndex);
  if (key && key.isBlocked && key.lastUsed) {
    const minutesSinceLastError = (new Date() - key.lastUsed) / (1000 * 60);
    if (minutesSinceLastError >= cooldownMinutes) {
      key.isBlocked = false;
      key.errorCount = 0;
      console.log(`✅ API Key ${keyIndex} reset after ${cooldownMinutes} minutes`);
      return true;
    }
  }
  return false;
}

/**
 * Test một API key
 */
async function testKey(apiKey) {
  const https = require('https');
  
  return new Promise((resolve, reject) => {
    const testPrompt = {
      contents: [{
        parts: [{
          text: 'Test'
        }]
      }]
    };

    const postData = JSON.stringify(testPrompt);
    
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey.key}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ success: true, key: apiKey });
        } else if (res.statusCode === 429) {
          reject({ success: false, error: 'rate_limit', key: apiKey });
        } else {
          reject({ success: false, error: `http_${res.statusCode}`, key: apiKey });
        }
      });
    });

    req.on('error', (error) => {
      reject({ success: false, error: error.message, key: apiKey });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({ success: false, error: 'timeout', key: apiKey });
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Test tất cả keys và tìm key tốt nhất
 */
async function findBestAvailableKey(keys) {
  console.log('🔍 Testing all API keys...\n');
  
  const results = [];
  
  for (const key of keys) {
    try {
      const result = await testKey(key);
      console.log(`✅ Key ${key.index}: OK`);
      results.push({ key, status: 'ok' });
    } catch (error) {
      if (error.error === 'rate_limit') {
        console.log(`⚠️  Key ${key.index}: Rate limited`);
        markKeyAsBlocked(keys, key.index);
        results.push({ key, status: 'rate_limited' });
      } else {
        console.log(`❌ Key ${key.index}: Error (${error.error})`);
        results.push({ key, status: 'error' });
      }
    }
    
    // Delay giữa các test
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  const availableKeys = results
    .filter(r => r.status === 'ok')
    .map(r => r.key);
  
  if (availableKeys.length > 0) {
    console.log(`\n✅ Found ${availableKeys.length} available key(s)`);
    return availableKeys[0];
  }
  
  console.log('\n⚠️  All keys are rate limited or have errors');
  console.log('💡 Recommendations:');
  console.log('   1. Wait for quota reset (usually hourly/daily)');
  console.log('   2. Upgrade Google Gemini API quota');
  console.log('   3. Add more API keys');
  
  return null;
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('🔄 Google Gemini API Key Rotator');
  console.log('='.repeat(60));
  console.log();

  const keys = getAPIKeys();
  
  if (keys.length === 0) {
    console.log('❌ No API keys found!');
    console.log('\n💡 Set environment variables:');
    console.log('   export GEMINI_API_KEY_1=your_key_1');
    console.log('   export GEMINI_API_KEY_2=your_key_2');
    console.log('   export GEMINI_API_KEY_3=your_key_3');
    return;
  }
  
  console.log(`📋 Found ${keys.length} API key(s)\n`);
  
  // Test và tìm key tốt nhất
  const bestKey = await findBestAvailableKey(keys);
  
  if (bestKey) {
    console.log(`\n✅ Recommended key: GEMINI_API_KEY_${bestKey.index}`);
    console.log(`   Use this key in your n8n workflow or backend`);
  }
  
  console.log('\n' + '='.repeat(60));
}

// Run nếu được gọi trực tiếp
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  getAPIKeys,
  selectBestKey,
  markKeyAsBlocked,
  resetKeyIfNeeded,
  findBestAvailableKey
};

