const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const N8N_BASE_URL = 'https://n8n.aidocmanageagent.io.vn';
const WORKFLOW_ID = process.env.N8N_WORKFLOW_ID_FLOW1 || '9ucTmgO083P7qCGQ';
const N8N_API_KEY = process.env.N8N_API_KEY;
const FLOW1_JSON_PATH = path.join(__dirname, '..', 'workflows', 'Flow 1.json');

async function importWorkflow() {
  console.log('📥 Importing Workflow from Flow 1.json...\n');
  
  try {
    // Read Flow 1.json
    if (!fs.existsSync(FLOW1_JSON_PATH)) {
      console.error(`❌ File not found: ${FLOW1_JSON_PATH}`);
      return;
    }
    
    const workflowData = JSON.parse(fs.readFileSync(FLOW1_JSON_PATH, 'utf8'));
    console.log(`✅ Loaded workflow: ${workflowData.name}`);
    console.log(`   Nodes: ${workflowData.nodes?.length || 0}`);
    
    // Only send required fields to avoid 400 error
    const workflowUpdate = {
      name: workflowData.name,
      nodes: workflowData.nodes,
      connections: workflowData.connections,
      settings: workflowData.settings || {},
      staticData: workflowData.staticData || {}
    };
    
    console.log(`\n🔄 Updating workflow in N8N (ID: ${WORKFLOW_ID})...`);
    
    // Update workflow via API
    const response = await axios.put(
      `${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`,
      workflowUpdate,
      {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        timeout: 30000
      }
    );
    
    console.log('✅ Workflow updated successfully!');
    console.log(`   Name: ${response.data.name || workflowData.name}`);
    console.log(`   Active: ${response.data.active || workflowData.active}`);
    console.log(`   Nodes: ${response.data.nodes?.length || workflowData.nodes?.length}`);
    
    console.log('\n⏳ Waiting 5 seconds for webhook to be registered...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n✅ Workflow import completed!');
    console.log('💡 You may need to:');
    console.log('   1. Test webhook in N8N UI');
    console.log('   2. Save workflow');
    console.log('   3. Ensure all credentials are set');
    
  } catch (error) {
    console.error('\n❌ Error importing workflow:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

importWorkflow().catch(console.error);

