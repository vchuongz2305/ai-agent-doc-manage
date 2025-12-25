/**
 * Script test gửi file đến webhook với Cloudinary integration
 * Test toàn bộ flow: Upload → Cloudinary → Webhook
 */

const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Use localhost for testing, not the n8n domain
const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000';
const N8N_BASE_URL = process.env.N8N_BASE_URL || 'https://n8n.aidocmanageagent.io.vn';
const FLOW1_URL = `${N8N_BASE_URL}/webhook/document-analyzer`;

async function testCloudinaryWebhookFlow() {
  console.log('🧪 Testing Cloudinary Webhook Flow...\n');
  console.log('='.repeat(60));
  
  // Step 1: Tìm file test
  console.log('\n📁 Step 1: Looking for test file...');
  const testFiles = [
    path.join(__dirname, '..', 'temp-downloaded.pdf'),
    path.join(__dirname, '..', 'uploads', '*.pdf'),
    path.join(__dirname, '..', 'Thông tin Trần hà Duy.pdf')
  ];
  
  let testFile = null;
  for (const filePath of testFiles) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      testFile = filePath;
      break;
    }
  }
  
  if (!testFile) {
    // Tạo file test đơn giản
    console.log('   ⚠️  No test file found, creating a simple test PDF...');
    testFile = path.join(__dirname, '..', 'test-upload.pdf');
    // Tạo file PDF đơn giản (minimal PDF structure)
    const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\nxref\n0 1\ntrailer\n<<\n/Size 1\n>>\nstartxref\n9\n%%EOF');
    fs.writeFileSync(testFile, pdfContent);
    console.log(`   ✅ Created test file: ${testFile}`);
  } else {
    console.log(`   ✅ Found test file: ${testFile}`);
  }
  
  const fileStats = fs.statSync(testFile);
  console.log(`   File size: ${(fileStats.size / 1024).toFixed(2)} KB`);
  
  // Step 2: Test upload qua API /api/document/process
  console.log('\n📤 Step 2: Testing file upload via /api/document/process...');
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFile), {
      filename: path.basename(testFile),
      contentType: 'application/pdf'
    });
    formData.append('userId', 'test-user-cloudinary');
    formData.append('department', 'IT');
    formData.append('processingId', `test_${Date.now()}`);
    
    console.log(`   Sending POST to: ${API_BASE_URL}/api/document/process`);
    console.log(`   File: ${path.basename(testFile)}`);
    
    const uploadResponse = await axios.post(
      `${API_BASE_URL}/api/document/process`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 60000, // 60 seconds
        validateStatus: (status) => status < 500 // Accept all except 5xx
      }
    );
    
    console.log(`   Status: ${uploadResponse.status}`);
    
    if (uploadResponse.status === 200 || uploadResponse.status === 201) {
      console.log('   ✅ Upload successful!');
      console.log(`   Response:`, JSON.stringify(uploadResponse.data, null, 2));
      
      const processingId = uploadResponse.data.processingId;
      const cloudinaryUrl = uploadResponse.data.cloudinaryUrl;
      
      if (cloudinaryUrl) {
        console.log(`   ✅ Cloudinary URL: ${cloudinaryUrl}`);
      } else {
        console.log('   ⚠️  No Cloudinary URL in response');
      }
      
      // Step 3: Kiểm tra status
      console.log('\n📊 Step 3: Checking processing status...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Đợi 2 giây
      
      try {
        const statusResponse = await axios.get(
          `${API_BASE_URL}/api/document/status/${processingId}`,
          { timeout: 10000 }
        );
        
        console.log(`   Status: ${statusResponse.data.status}`);
        console.log(`   Cloudinary URL: ${statusResponse.data.cloudinaryUrl || 'Not set'}`);
        console.log(`   Steps:`, statusResponse.data.steps);
        
      } catch (statusError) {
        console.log(`   ⚠️  Could not get status: ${statusError.message}`);
      }
      
      // Step 4: Test webhook trực tiếp với Cloudinary URL
      console.log('\n🔗 Step 4: Testing webhook directly with Cloudinary URL...');
      
      if (cloudinaryUrl) {
        const webhookData = {
          file: {
            name: path.basename(testFile),
            url: cloudinaryUrl,
            cloudinary_url: cloudinaryUrl,
            size: fileStats.size,
            mimeType: 'application/pdf'
          },
          userId: 'test-user-cloudinary',
          department: 'IT',
          processingId: `webhook_test_${Date.now()}`
        };
        
        console.log(`   Sending POST to: ${FLOW1_URL}`);
        console.log(`   Data:`, JSON.stringify({
          ...webhookData,
          file: {
            ...webhookData.file,
            url: cloudinaryUrl.substring(0, 50) + '...'
          }
        }, null, 2));
        
        try {
          const webhookResponse = await axios.post(FLOW1_URL, webhookData, {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 30000,
            validateStatus: (status) => status < 500
          });
          
          console.log(`   Status: ${webhookResponse.status}`);
          
          if (webhookResponse.status === 200) {
            console.log('   ✅ Webhook call successful!');
            console.log(`   Response:`, JSON.stringify(webhookResponse.data, null, 2));
          } else if (webhookResponse.status === 404) {
            console.log('   ❌ Webhook not found (404)');
            console.log('   💡 Make sure workflow is activated in n8n');
          } else {
            console.log(`   ⚠️  Webhook returned status: ${webhookResponse.status}`);
            console.log(`   Response:`, JSON.stringify(webhookResponse.data, null, 2));
          }
          
        } catch (webhookError) {
          console.log(`   ❌ Webhook error: ${webhookError.message}`);
          if (webhookError.response) {
            console.log(`   Status: ${webhookError.response.status}`);
            console.log(`   Data:`, JSON.stringify(webhookError.response.data, null, 2));
          }
        }
      } else {
        console.log('   ⚠️  Skipping webhook test (no Cloudinary URL)');
      }
      
    } else {
      console.log(`   ❌ Upload failed with status: ${uploadResponse.status}`);
      console.log(`   Response:`, JSON.stringify(uploadResponse.data, null, 2));
    }
    
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
    }
    if (error.code === 'ECONNREFUSED') {
      console.error('   💡 Make sure the backend server is running on port 5000');
    }
  }
  
  // Step 5: Test Cloudinary upload API endpoint
  console.log('\n📤 Step 5: Testing /api/cloudinary/upload endpoint...');
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFile), {
      filename: path.basename(testFile),
      contentType: 'application/pdf'
    });
    formData.append('processingId', `api_test_${Date.now()}`);
    formData.append('fileName', path.basename(testFile));
    
    const cloudinaryResponse = await axios.post(
      `${API_BASE_URL}/api/cloudinary/upload`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 60000
      }
    );
    
    console.log(`   Status: ${cloudinaryResponse.status}`);
    console.log('   ✅ Cloudinary upload API works!');
    console.log(`   Public ID: ${cloudinaryResponse.data.cloudinary.public_id}`);
    console.log(`   URL: ${cloudinaryResponse.data.cloudinary.secure_url}`);
    
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Test completed!');
  console.log('\n📋 Summary:');
  console.log('   - Check above for any errors');
  console.log('   - Verify Cloudinary upload worked');
  console.log('   - Verify webhook received the request');
  console.log('   - Check n8n execution logs for workflow status');
}

// Run test
testCloudinaryWebhookFlow().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});

