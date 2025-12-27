// Test script để kiểm tra endpoint /gdpr có hoạt động không
const axios = require('axios');

async function testGDPREndpoint() {
  try {
    console.log('🧪 Testing /gdpr endpoint...');
    console.log('📡 URL: http://localhost:5000/gdpr?limit=10&has_analysis=true');
    
    const response = await axios.get('http://localhost:5000/gdpr', {
      params: {
        limit: 10,
        has_analysis: true
      }
    });
    
    console.log('✅ Response status:', response.status);
    console.log('✅ Response data:', {
      success: response.data.success,
      count: response.data.data?.length || 0,
      pagination: response.data.pagination
    });
    
    if (response.data.success && response.data.data) {
      const files = response.data.data;
      console.log(`\n📊 Found ${files.length} files:`);
      files.slice(0, 3).forEach((file, index) => {
        console.log(`\n  ${index + 1}. ${file.file_name}`);
        console.log(`     - Processing ID: ${file.processing_id}`);
        console.log(`     - Has Analysis: ${file.has_analysis}`);
        console.log(`     - Has GDPR Result: ${file.has_gdpr_result}`);
        if (file.gdpr_result) {
          console.log(`     - GDPR Decision: ${file.gdpr_result.gdpr_decision}`);
        }
      });
      
      if (files.length > 3) {
        console.log(`\n  ... and ${files.length - 3} more files`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing endpoint:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    } else if (error.request) {
      console.error('   No response received. Is backend server running?');
      console.error('   Error:', error.message);
    } else {
      console.error('   Error:', error.message);
    }
    process.exit(1);
  }
}

testGDPREndpoint();

