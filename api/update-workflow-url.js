const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const N8N_BASE_URL = 'https://n8n.aidocmanageagent.io.vn';
const WORKFLOW_ID = process.env.N8N_WORKFLOW_ID_FLOW1 || '9ucTmgO083P7qCGQ';
const N8N_API_KEY = process.env.N8N_API_KEY;

async function updateWorkflowUrl() {
  console.log('🔄 Updating workflow URL configuration...\n');
  
  try {
    // 1. Get current workflow from N8N
    console.log('1️⃣ Fetching current workflow from N8N...');
    const getResponse = await axios.get(
      `${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`,
      {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'accept': 'application/json'
        },
        timeout: 30000
      }
    );
    
    const workflow = getResponse.data;
    console.log(`✅ Loaded workflow: ${workflow.name}`);
    console.log(`   Nodes: ${workflow.nodes?.length || 0}`);
    
    // 2. Find "Set File Data" node and add file_url field
    console.log('\n2️⃣ Updating "Set File Data" node...');
    const setFileDataNode = workflow.nodes.find(n => n.name === 'Set File Data');
    if (!setFileDataNode) {
      console.error('❌ "Set File Data" node not found!');
      return;
    }
    
    // Check if file_url already exists
    const hasFileUrl = setFileDataNode.parameters.assignments?.assignments?.some(
      a => a.name === 'file_url'
    );
    
    if (!hasFileUrl) {
      // Add file_url assignment
      setFileDataNode.parameters.assignments.assignments.push({
        id: `file-url-${Date.now()}`,
        name: 'file_url',
        value: '={{ $json.body.file.url }}',
        type: 'string'
      });
      console.log('   ✅ Added file_url field');
    } else {
      console.log('   ℹ️  file_url field already exists');
    }
    
    // 3. Find "Download File" node and update URL
    console.log('\n3️⃣ Updating "Download File" node...');
    const downloadFileNode = workflow.nodes.find(n => n.name === 'Download File');
    if (!downloadFileNode) {
      console.error('❌ "Download File" node not found!');
      return;
    }
    
    const oldUrl = downloadFileNode.parameters.url;
    downloadFileNode.parameters.url = "={{ $('Set File Data').item.json.file_url }}";
    
    // Ensure method is GET for downloading files
    if (!downloadFileNode.parameters.method) {
      downloadFileNode.parameters.method = "GET";
      console.log('   ✅ Added method: GET');
    }
    
    // Ensure responseFormat is "file"
    if (!downloadFileNode.parameters.options?.response?.response?.responseFormat) {
      downloadFileNode.parameters.options = downloadFileNode.parameters.options || {};
      downloadFileNode.parameters.options.response = downloadFileNode.parameters.options.response || {};
      downloadFileNode.parameters.options.response.response = downloadFileNode.parameters.options.response.response || {};
      downloadFileNode.parameters.options.response.response.responseFormat = "file";
      console.log('   ✅ Ensured responseFormat: file');
    }
    
    console.log(`   Old URL: ${oldUrl.substring(0, 80)}...`);
    console.log(`   New URL: ${downloadFileNode.parameters.url}`);
    console.log(`   Method: ${downloadFileNode.parameters.method}`);
    
    // 4. Update workflow in N8N
    // Only send required fields to avoid 400 error
    // Note: 'active' and 'tags' are read-only
    console.log('\n4️⃣ Saving workflow to N8N...');
    const workflowUpdate = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings || {},
      staticData: workflow.staticData || {}
    };
    
    const updateResponse = await axios.put(
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
    console.log(`   Name: ${updateResponse.data.name}`);
    console.log(`   Active: ${updateResponse.data.active}`);
    
    console.log('\n⏳ Waiting 5 seconds for changes to take effect...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n✅ Update completed!');
    console.log('💡 Next steps:');
    console.log('   1. Test webhook in N8N UI to verify');
    console.log('   2. Upload a new file from frontend');
    console.log('   3. Check that fileUrl uses https://n8n.aidocmanageagent.io.vn');
    
  } catch (error) {
    console.error('\n❌ Error updating workflow:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

updateWorkflowUrl().catch(console.error);

