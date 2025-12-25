const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testWebhook() {
    console.log('🧪 Testing Webhook Integration...\n');

    // Test file path (use a sample PDF if available)
    const testFilePath = path.join(__dirname, '..', 'Thông tin Trần hà Duy.pdf');
    
    if (!fs.existsSync(testFilePath)) {
        console.log('❌ Test file not found:', testFilePath);
        console.log('💡 Please ensure the PDF file exists in the project root');
        return;
    }

    try {
        // Step 1: Check if backend is running
        console.log('1️⃣ Checking Backend API...');
        const backendCheck = await axios.get('http://localhost:5000/api/document/process');
        console.log('✅ Backend is running');
        console.log('📊 Endpoint info:', backendCheck.data.message);
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ Backend not running on port 5000');
            console.log('💡 Please start backend: npm start');
            return;
        } else {
            console.log('⚠️ Backend check error:', error.message);
        }
    }

    try {
        // Step 2: Upload file to trigger webhook
        console.log('\n2️⃣ Uploading file to trigger webhook...');
        
        const formData = new FormData();
        formData.append('file', fs.createReadStream(testFilePath));
        formData.append('userId', 'test-user-001');
        formData.append('department', 'IT');
        formData.append('sharingEmails', 'test@example.com');

        console.log('📤 Sending request to: http://localhost:5000/api/document/process');
        console.log('📋 Form data:', {
            fileName: path.basename(testFilePath),
            userId: 'test-user-001',
            department: 'IT',
            sharingEmails: 'test@example.com'
        });

        const response = await axios.post('http://localhost:5000/api/document/process', formData, {
            headers: formData.getHeaders(),
            timeout: 60000 // 60 seconds timeout
        });

        console.log('✅ File uploaded successfully!');
        console.log('📊 Response:', response.data);

        if (response.data.processingId) {
            const processingId = response.data.processingId;
            console.log(`\n🆔 Processing ID: ${processingId}`);

            // Step 3: Check processing status
            console.log('\n3️⃣ Checking processing status...');
            
            // Wait a bit for webhook to process
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            try {
                const statusResponse = await axios.get(`http://localhost:5000/api/document/status/${processingId}`);
                console.log('📊 Processing Status:');
                console.log(JSON.stringify(statusResponse.data, null, 2));
                
                // Check if webhook was triggered
                if (statusResponse.data.steps) {
                    console.log('\n📈 Step Status:');
                    console.log(`  - Analysis: ${statusResponse.data.steps.analysis}`);
                    console.log(`  - GDPR: ${statusResponse.data.steps.gdpr}`);
                    console.log(`  - Sharing: ${statusResponse.data.steps.sharing}`);
                    
                    if (statusResponse.data.steps.analysis === 'completed') {
                        console.log('\n✅ Webhook was successfully triggered!');
                    } else if (statusResponse.data.steps.analysis === 'failed') {
                        console.log('\n❌ Webhook failed:', statusResponse.data.error);
                    } else {
                        console.log('\n⏳ Webhook is still processing...');
                    }
                }
            } catch (statusError) {
                console.log('⚠️ Could not fetch status:', statusError.message);
            }
        }

    } catch (error) {
        console.error('\n❌ Error testing webhook:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else if (error.request) {
            console.error('Request made but no response received');
            console.error('Error:', error.message);
        } else {
            console.error('Error:', error.message);
        }
    }

    console.log('\n📋 Test Summary:');
    console.log('- Backend API: http://localhost:5000');
    console.log('- Webhook URL: https://n8n.aidocmanageagent.io.vn/webhook/document-analyzer');
    console.log('- Check backend logs for webhook request details');
}

// Run the test
if (require.main === module) {
    testWebhook().catch(console.error);
}

module.exports = { testWebhook };

