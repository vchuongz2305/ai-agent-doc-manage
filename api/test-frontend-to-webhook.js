const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Simulate frontend request
async function testFrontendToWebhook() {
  console.log('🧪 Testing Frontend → Backend → Webhook Flow...\n');
  
  const testFilePath = path.join(__dirname, '..', 'Thông tin Trần hà Duy.pdf');
  
  if (!fs.existsSync(testFilePath)) {
    console.log('❌ Test file not found:', testFilePath);
    return;
  }
  
  try {
    // Step 1: Upload file (simulate frontend)
    console.log('1️⃣ Uploading file to backend (simulating frontend)...');
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath));
    formData.append('userId', 'user001');
    formData.append('department', 'IT');
    formData.append('sharingEmails', 'test@example.com');
    
    console.log('📤 Sending POST to http://localhost:5000/api/document/process');
    
    const response = await axios.post('http://localhost:5000/api/document/process', formData, {
      headers: formData.getHeaders(),
      timeout: 60000
    });
    
    console.log('✅ Backend response:', response.data);
    
    if (response.data.processingId) {
      const processingId = response.data.processingId;
      console.log(`\n🆔 Processing ID: ${processingId}`);
      
      // Step 2: Check status immediately
      console.log('\n2️⃣ Checking processing status...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      try {
        const statusResponse = await axios.get(`http://localhost:5000/api/document/status/${processingId}`);
        const status = statusResponse.data;
        
        console.log('\n📊 Processing Status:');
        console.log(`   Overall: ${status.status}`);
        console.log(`   Analysis: ${status.steps?.analysis || 'N/A'}`);
        console.log(`   GDPR: ${status.steps?.gdpr || 'N/A'}`);
        console.log(`   Sharing: ${status.steps?.sharing || 'N/A'}`);
        
        if (status.error) {
          console.log(`\n❌ Error: ${status.error}`);
        }
        
        if (status.steps?.analysis === 'failed') {
          console.log('\n💡 Analysis failed. Check backend logs for details.');
        } else if (status.steps?.analysis === 'completed') {
          console.log('\n✅ Analysis completed successfully!');
        } else if (status.steps?.analysis === 'pending') {
          console.log('\n⏳ Analysis still pending. Webhook may not have been triggered yet.');
          console.log('💡 Check N8N execution logs to see if webhook received the request.');
        }
        
      } catch (statusError) {
        console.error('❌ Error checking status:', statusError.message);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testFrontendToWebhook().catch(console.error);

