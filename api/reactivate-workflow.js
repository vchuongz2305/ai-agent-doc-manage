const axios = require('axios');
// Load .env from project root
require('../load-env');

const N8N_BASE_URL = 'https://n8n.aidocmanageagent.io.vn';
const WORKFLOW_ID = process.env.N8N_WORKFLOW_ID_FLOW1 || '9ucTmgO083P7qCGQ';
const N8N_API_KEY = process.env.N8N_API_KEY;

function getN8NHeaders() {
  return {
    'X-N8N-API-KEY': N8N_API_KEY,
    'Content-Type': 'application/json',
    'accept': 'application/json'
  };
}

async function reactivateWorkflow() {
  console.log('🔄 Reactivating workflow to force webhook registration...\n');
  
  try {
    // 1. Deactivate workflow
    console.log('1️⃣ Deactivating workflow...');
    await axios.post(
      `${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}/activate`,
      { active: false },
      { headers: getN8NHeaders(), timeout: 10000 }
    );
    console.log('   ✅ Workflow deactivated');
    
    // 2. Wait a bit
    console.log('\n2️⃣ Waiting 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 3. Activate workflow
    console.log('3️⃣ Activating workflow...');
    await axios.post(
      `${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}/activate`,
      { active: true },
      { headers: getN8NHeaders(), timeout: 10000 }
    );
    console.log('   ✅ Workflow activated');
    
    // 4. Wait for webhook registration
    console.log('\n4️⃣ Waiting 10 seconds for webhook registration...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // 5. Test webhook
    console.log('5️⃣ Testing webhook...');
    const testData = {
      file: {
        name: 'test.pdf',
        url: 'https://api.aidocmanageagent.io.vn/uploads/test.pdf'
      },
      userId: 'test',
      department: 'IT',
      processingId: 'test-' + Date.now()
    };
    
    try {
      const response = await axios.post(
        `${N8N_BASE_URL}/webhook/document-analyzer`,
        testData,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000,
          validateStatus: () => true
        }
      );
      
      if (response.status === 404) {
        console.log('   ❌ Webhook still returns 404');
        console.log('   💡 You may need to manually test webhook in N8N UI');
      } else if (response.status >= 200 && response.status < 300) {
        console.log('   ✅ Webhook is working!');
      } else {
        console.log(`   ⚠️ Status: ${response.status}`);
      }
    } catch (error) {
      console.log(`   ⚠️ Error testing: ${error.message}`);
    }
    
    console.log('\n✅ Reactivation completed!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

reactivateWorkflow().catch(console.error);

