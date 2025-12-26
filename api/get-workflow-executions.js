const axios = require('axios');
// Load .env from project root
require('../load-env');

const N8N_BASE_URL = 'https://n8n.aidocmanageagent.io.vn';
const WORKFLOW_ID = process.env.N8N_WORKFLOW_ID_FLOW1 || '9ucTmgO083P7qCGQ';
const N8N_API_KEY = process.env.N8N_API_KEY;

async function getWorkflowExecutions() {
  console.log('🔍 Getting Workflow Executions...\n');
  console.log(`Workflow ID: ${WORKFLOW_ID}\n`);
  
  try {
    // Get recent executions
    const response = await axios.get(
      `${N8N_BASE_URL}/api/v1/executions`,
      {
        params: {
          workflowId: WORKFLOW_ID,
          limit: 5
        },
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'accept': 'application/json'
        },
        timeout: 10000
      }
    );
    
    const executions = response.data.data || response.data || [];
    console.log(`Found ${executions.length} recent executions:\n`);
    
    if (executions.length === 0) {
      console.log('❌ No executions found');
      return;
    }
    
    // Get details of the most recent execution
    const latestExecution = executions[0];
    console.log('📋 Latest Execution:');
    console.log(`   ID: ${latestExecution.id}`);
    const status = latestExecution.finished 
      ? (latestExecution.stoppedAt ? '❌ FAILED' : (latestExecution.waitTill ? '⏳ WAITING' : '✅ SUCCESS'))
      : '🔄 RUNNING';
    console.log(`   Status: ${status}`);
    console.log(`   Mode: ${latestExecution.mode || 'N/A'}`);
    console.log(`   Started: ${latestExecution.startedAt || 'N/A'}`);
    console.log(`   Finished: ${latestExecution.stoppedAt || latestExecution.finishedAt || 'N/A'}`);
    
    // Get execution details
    try {
      const detailResponse = await axios.get(
        `${N8N_BASE_URL}/api/v1/executions/${latestExecution.id}`,
        {
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
            'accept': 'application/json'
          },
          timeout: 10000
        }
      );
      
      const execution = detailResponse.data.data || detailResponse.data;
      
      // Check if execution has data
      if (!execution.data) {
        console.log('\n⚠️ Execution has no data field');
        console.log('   This might mean the workflow failed very early');
        console.log('   Full execution object:', JSON.stringify(execution, null, 2));
        return;
      }
      
      console.log('\n📦 Execution Data Structure:');
      console.log('   Has data:', !!execution.data);
      console.log('   Has resultData:', !!execution.data.resultData);
      
      if (execution.data && execution.data.resultData) {
        console.log('\n📊 Execution Results:');
        const resultData = execution.data.resultData;
        
        if (resultData.error) {
          console.log('\n❌ ERRORS:');
          console.log(JSON.stringify(resultData.error, null, 2));
        }
        
        if (resultData.runData) {
          console.log('\n🔍 Node Execution Status:');
          Object.keys(resultData.runData).forEach(nodeName => {
            const nodeData = resultData.runData[nodeName];
            if (nodeData && nodeData[0]) {
              const execution = nodeData[0];
              const status = execution.error ? '❌ ERROR' : '✅ SUCCESS';
              console.log(`   ${nodeName}: ${status}`);
              if (execution.error) {
                console.log(`      Error: ${execution.error.message || JSON.stringify(execution.error)}`);
              }
            }
          });
        }
      }
      
      if (execution.data && execution.data.resultData && execution.data.resultData.error) {
        console.log('\n❌ WORKFLOW ERROR DETAILS:');
        const error = execution.data.resultData.error;
        console.log(`   Message: ${error.message || 'Unknown error'}`);
        if (error.stack) {
          console.log(`   Stack: ${error.stack}`);
        }
        if (error.context) {
          console.log(`   Context: ${JSON.stringify(error.context, null, 2)}`);
        }
      }
      
    } catch (detailError) {
      console.error('❌ Error getting execution details:', detailError.message);
      if (detailError.response) {
        console.error('   Status:', detailError.response.status);
        console.error('   Data:', detailError.response.data);
      }
    }
    
  } catch (error) {
    console.error('❌ Error getting executions:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

getWorkflowExecutions().catch(console.error);

