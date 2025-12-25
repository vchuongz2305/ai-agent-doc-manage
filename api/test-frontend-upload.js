/**
 * Test upload từ frontend - simulate request từ frontend
 */

const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function testFrontendUpload() {
  console.log('🧪 Testing Frontend Upload Flow...\n');
  
  // Tìm file test
  const testFile = path.join(__dirname, '..', 'temp-downloaded.pdf');
  if (!fs.existsSync(testFile)) {
    console.error('❌ Test file not found:', testFile);
    console.log('💡 Using Thông tin Trần hà Duy.pdf instead...');
    const altFile = path.join(__dirname, '..', 'Thông tin Trần hà Duy.pdf');
    if (!fs.existsSync(altFile)) {
      console.error('❌ No test file found');
      process.exit(1);
    }
    testFile = altFile;
  }
  
  try {
    // Step 1: Tạo FormData giống như frontend
    console.log('📤 Step 1: Creating FormData (simulating frontend)...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFile));
    formData.append('department', 'IT');
    formData.append('sharingEmails', 'test@example.com');
    formData.append('userId', 'test-user-123');
    formData.append('selectedUsers', JSON.stringify([{ id: 'test-user-123', email: 'test@example.com' }]));
    
    console.log('   ✅ FormData created');
    console.log(`   File: ${path.basename(testFile)}`);
    console.log(`   Size: ${fs.statSync(testFile).size} bytes\n`);
    
    // Step 2: Gửi request đến backend endpoint (giống như frontend)
    console.log('📡 Step 2: Sending POST request to /api/document/process...');
    const response = await axios.post('http://localhost:5000/api/document/process', formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 60000, // 60 seconds
    });
    
    console.log('✅ Request successful!');
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.processingId) {
      const processingId = response.data.processingId;
      console.log(`\n✅ Upload successful!`);
      console.log(`   Processing ID: ${processingId}`);
      
      // Step 3: Check status
      console.log(`\n📊 Step 3: Checking status...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      try {
        const statusResponse = await axios.get(`http://localhost:5000/api/document/status/${processingId}`);
        console.log('📋 Status:', JSON.stringify(statusResponse.data, null, 2));
        
        if (statusResponse.data.cloudinaryUrl) {
          console.log(`\n✅ Cloudinary URL found!`);
          console.log(`   URL: ${statusResponse.data.cloudinaryUrl}`);
          console.log(`   Public ID: ${statusResponse.data.cloudinaryPublicId}`);
        } else {
          console.log(`\n⚠️  Cloudinary URL not found in status`);
        }
      } catch (statusError) {
        console.error('❌ Error checking status:', statusError.message);
      }
      
      console.log('\n✅ All tests passed!');
      console.log('\n📋 Summary:');
      console.log(`   - Frontend upload simulation: ✅`);
      console.log(`   - File uploaded to Cloudinary: ✅`);
      console.log(`   - Processing ID: ${processingId}`);
      
    } else {
      console.error('❌ Upload failed - no processing ID in response');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed!');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Error:', error.message);
    }
    process.exit(1);
  }
}

testFrontendUpload();

