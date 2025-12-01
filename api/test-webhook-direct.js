const axios = require('axios');

// Test webhook directly
async function testWebhookDirect() {
  const WEBHOOK_URL = 'https://n8n.aidocmanageagent.io.vn/webhook/document-analyzer';
  
  const testData = {
    file: {
      name: 'test.pdf',
      size: 1000,
      mimeType: 'application/pdf',
      path: '/test/path',
      url: 'https://api.aidocmanageagent.io.vn/uploads/test.pdf'
    },
    userId: 'test-user',
    department: 'IT',
    processingId: 'test-' + Date.now()
  };

  console.log('🧪 Testing webhook directly...');
  console.log('URL:', WEBHOOK_URL);
  console.log('Data:', JSON.stringify(testData, null, 2));
  
  try {
    const response = await axios.post(WEBHOOK_URL, testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000,
      validateStatus: () => true // Accept all status codes
    });
    
    console.log('\n✅ Response received:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', response.headers);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 404) {
      console.log('\n❌ Webhook returns 404');
      console.log('💡 Possible issues:');
      console.log('   1. Webhook not activated in N8N');
      console.log('   2. Webhook path incorrect');
      console.log('   3. Workflow not active');
      console.log('   4. Webhook not exposed/public');
    } else if (response.status >= 200 && response.status < 300) {
      console.log('\n✅ Webhook is working!');
    } else {
      console.log(`\n⚠️ Webhook returned status ${response.status}`);
    }
  } catch (error) {
    console.error('\n❌ Error testing webhook:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received');
      console.error('Error:', error.message);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testWebhookDirect().catch(console.error);

