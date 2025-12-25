const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const N8N_BASE_URL = 'https://n8n.aidocmanageagent.io.vn';
const WEBHOOK_URL = `${N8N_BASE_URL}/webhook/document-analyzer`;
const WORKFLOW_ID = process.env.N8N_WORKFLOW_ID_FLOW1 || 'XoHMfHi0FLNWjqeF';
const N8N_API_KEY = process.env.N8N_API_KEY;

async function checkWebhookStatus() {
  console.log('🔍 Checking Webhook Status...\n');
  
  // 1. Check workflow status
  console.log('1️⃣ Checking workflow status...');
  try {
    const workflowResponse = await axios.get(
      `${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`,
      {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'accept': 'application/json'
        },
        timeout: 5000
      }
    );
    
    const workflow = workflowResponse.data;
    console.log(`   Workflow: ${workflow.name}`);
    console.log(`   Status: ${workflow.active ? '✅ ACTIVE' : '❌ INACTIVE'}`);
    console.log(`   ID: ${workflow.id}`);
    
    if (!workflow.active) {
      console.log('\n⚠️ Workflow is NOT active! Activating...');
      try {
        await axios.post(
          `${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}/activate`,
          { active: true },
          {
            headers: {
              'X-N8N-API-KEY': N8N_API_KEY,
              'Content-Type': 'application/json'
            },
            timeout: 5000
          }
        );
        console.log('✅ Workflow activated!');
      } catch (err) {
        console.error('❌ Failed to activate:', err.message);
      }
    }
  } catch (error) {
    console.error('❌ Error checking workflow:', error.message);
  }
  
  // 2. Test webhook
  console.log('\n2️⃣ Testing webhook...');
  console.log(`   URL: ${WEBHOOK_URL}`);
  
  const testData = {
    file: {
      name: 'test.pdf',
      url: 'https://example.com/test.pdf'
    },
    userId: 'test',
    department: 'IT',
    processingId: 'test-' + Date.now()
  };
  
  // Try multiple times with delays
  const delays = [2000, 5000, 10000];
  let success = false;
  
  for (let i = 0; i < delays.length; i++) {
    if (i > 0) {
      console.log(`\n   ⏳ Waiting ${delays[i]/1000}s before attempt ${i + 1}...`);
      await new Promise(resolve => setTimeout(resolve, delays[i]));
    }
    
    try {
      console.log(`   🔄 Attempt ${i + 1}/${delays.length}...`);
      const response = await axios.post(WEBHOOK_URL, testData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000,
        validateStatus: () => true
      });
      
      console.log(`   Status: ${response.status}`);
      
      if (response.status === 404) {
        const errorMsg = response.data?.message || 'Not found';
        console.log(`   ❌ 404: ${errorMsg}`);
        if (errorMsg.includes('not registered')) {
          console.log('   💡 Webhook is not registered yet.');
          console.log('   💡 You need to:');
          console.log('      1. Go to N8N dashboard');
          console.log('      2. Open the workflow');
          console.log('      3. Click on Webhook node');
          console.log('      4. Click "Test" button');
          console.log('      5. Save the workflow');
        }
      } else if (response.status >= 200 && response.status < 300) {
        console.log(`   ✅ SUCCESS! Webhook is working!`);
        console.log(`   Response data:`, JSON.stringify(response.data, null, 2));
        success = true;
        break;
      } else if (response.status === 500) {
        console.log(`   ❌ 500: Error in workflow execution`);
        console.log(`   Response data:`, JSON.stringify(response.data, null, 2));
        console.log(`   💡 Check N8N execution logs for details`);
        console.log(`   💡 Common causes:`);
        console.log(`      1. Missing credentials in workflow nodes`);
        console.log(`      2. Invalid data format`);
        console.log(`      3. Node execution error`);
        console.log(`      4. Missing required fields in request`);
      } else {
        console.log(`   ⚠️ Status ${response.status}: ${response.data?.message || JSON.stringify(response.data)}`);
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }
  
  if (!success) {
    console.log('\n❌ Webhook is not working after all attempts.');
    console.log('\n📋 MANUAL FIX REQUIRED:');
    console.log('1. Open N8N: https://n8n.aidocmanageagent.io.vn');
    console.log('2. Open workflow "Dang Hong Nguyen - Analyze document"');
    console.log('3. Ensure workflow is ACTIVE (toggle in top-right)');
    console.log('4. Click on Webhook node');
    console.log('5. Click "Test" or "Listen for test event"');
    console.log('6. Send a test request');
    console.log('7. Save the workflow');
    console.log('8. Wait 10-15 seconds');
    console.log('9. Try again');
  }
}

checkWebhookStatus().catch(console.error);

