/**
 * Script test đơn giản - Gửi file đến webhook với Cloudinary URL
 * Test nhanh không cần backend chạy
 */

const path = require('path');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'https://n8n.aidocmanageagent.io.vn';
const FLOW1_URL = `${N8N_BASE_URL}/webhook/document-analyzer`;

async function testWebhookWithCloudinary() {
  console.log('🧪 Testing Webhook với Cloudinary URL...\n');
  
  // Step 1: Upload file lên Cloudinary trước
  console.log('📤 Step 1: Uploading file to Cloudinary...');
  const { uploadFileToCloudinary } = require('./cloudinary-upload');
  
  // Tìm file test
  const testFile = path.join(__dirname, '..', 'temp-downloaded.pdf');
  if (!fs.existsSync(testFile)) {
    console.error('❌ Test file not found:', testFile);
    process.exit(1);
  }
  
  const processingId = `test_${Date.now()}`;
  const fileName = 'test-document.pdf';
  
  try {
    const cloudinaryResult = await uploadFileToCloudinary(
      testFile,
      processingId,
      fileName
    );
    
    console.log('✅ File uploaded to Cloudinary!');
    console.log(`   Public ID: ${cloudinaryResult.public_id}`);
    console.log(`   URL: ${cloudinaryResult.secure_url}\n`);
    
    // Step 2: Gửi đến webhook với Cloudinary URL
    console.log('🔗 Step 2: Sending to webhook with Cloudinary URL...');
    console.log(`   Webhook URL: ${FLOW1_URL}\n`);
    
    const webhookData = {
      file: {
        name: fileName,
        url: cloudinaryResult.secure_url,
        cloudinary_url: cloudinaryResult.secure_url,
        cloudinary_public_id: cloudinaryResult.public_id,
        size: fs.statSync(testFile).size,
        mimeType: 'application/pdf'
      },
      userId: 'test-user',
      department: 'IT',
      processingId: processingId
    };
    
    console.log('📋 Webhook Data:');
    console.log(JSON.stringify({
      ...webhookData,
      file: {
        ...webhookData.file,
        url: webhookData.file.url.substring(0, 80) + '...'
      }
    }, null, 2));
    console.log('');
    
    const response = await axios.post(FLOW1_URL, webhookData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000,
      validateStatus: (status) => status < 500
    });
    
    console.log(`📊 Response Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ Webhook call thành công!');
      console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    } else if (response.status === 404) {
      console.log('❌ Webhook not found (404)');
      console.log('💡 Hãy kiểm tra:');
      console.log('   1. Workflow đã được activate chưa?');
      console.log('   2. Webhook path có đúng không? (document-analyzer)');
      console.log('   3. N8N server có đang chạy không?');
    } else {
      console.log(`⚠️  Webhook returned status: ${response.status}`);
      console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    }
    
    // Step 3: Kiểm tra execution trong n8n (nếu có API key)
    if (process.env.N8N_API_KEY) {
      console.log('\n📊 Step 3: Checking n8n executions...');
      try {
        const execResponse = await axios.get(
          `${N8N_BASE_URL}/api/v1/executions`,
          {
            headers: {
              'X-N8N-API-KEY': process.env.N8N_API_KEY
            },
            params: {
              workflowId: process.env.N8N_WORKFLOW_ID_FLOW1 || '9ucTmgO083P7qCGQ',
              limit: 1
            },
            timeout: 10000
          }
        );
        
        if (execResponse.data && execResponse.data.data && execResponse.data.data.length > 0) {
          const latestExecution = execResponse.data.data[0];
          console.log(`   Latest execution ID: ${latestExecution.id}`);
          console.log(`   Status: ${latestExecution.finished ? 'Finished' : 'Running'}`);
          console.log(`   Mode: ${latestExecution.mode}`);
        }
      } catch (execError) {
        console.log('   ⚠️  Could not check executions:', execError.message);
      }
    }
    
    console.log('\n✅ Test completed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Check n8n execution logs: https://n8n.aidocmanageagent.io.vn');
    console.log('   2. Verify file was downloaded from Cloudinary');
    console.log('   3. Check if PDF extraction worked');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   💡 N8N server không thể kết nối');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('   💡 Request timeout - có thể workflow đang chạy lâu');
    }
    
    process.exit(1);
  }
}

// Run test
testWebhookWithCloudinary().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});

