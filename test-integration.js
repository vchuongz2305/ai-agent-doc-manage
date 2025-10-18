const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Test configuration
const API_BASE_URL = 'http://localhost:3000';
const TEST_FILE_PATH = 'Thông tin Trần hà Duy.pdf';

async function testUnifiedDocumentAgent() {
    console.log('🧪 Testing Unified Document Management Agent...\n');

    try {
        // Check if test file exists
        if (!fs.existsSync(TEST_FILE_PATH)) {
            console.log('❌ Test file not found:', TEST_FILE_PATH);
            console.log('Please ensure the PDF file exists in the current directory');
            return;
        }

        // Create form data
        const formData = new FormData();
        formData.append('file', fs.createReadStream(TEST_FILE_PATH));
        formData.append('userId', 'test_user_123');
        formData.append('department', 'HR');
        formData.append('sharingEmails', 'danghongnguyen0175@gmail.com,tranhaduy204@gmail.com,congbui@gmail.com');

        console.log('📤 Uploading document...');
        console.log('File:', TEST_FILE_PATH);
        console.log('User ID: test_user_123');
        console.log('Department: HR');
        console.log('Sharing emails: danghongnguyen0175@gmail.com,tranhaduy204@gmail.com,congbui@gmail.com\n');

        // Upload document
        const uploadResponse = await axios.post(`${API_BASE_URL}/api/document/process`, formData, {
            headers: {
                ...formData.getHeaders()
            }
        });

        if (uploadResponse.data.success) {
            const processingId = uploadResponse.data.processingId;
            console.log('✅ Document uploaded successfully!');
            console.log('Processing ID:', processingId);
            console.log('Status:', uploadResponse.data.status);
            console.log('Message:', uploadResponse.data.message);

            // Monitor processing status
            console.log('\n📊 Monitoring processing status...');
            await monitorProcessingStatus(processingId);

        } else {
            console.log('❌ Upload failed:', uploadResponse.data.message);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

async function monitorProcessingStatus(processingId) {
    const maxAttempts = 30; // 1 minute with 2-second intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/document/status/${processingId}`);
            const status = response.data;

            console.log(`\n📊 Status Check ${attempts + 1}:`);
            console.log('Overall Status:', status.status);
            console.log('File:', status.fileName);
            console.log('Size:', (status.fileSize / 1024 / 1024).toFixed(2), 'MB');
            console.log('Type:', status.mimeType);

            // Display step status
            console.log('\n📋 Processing Steps:');
            Object.entries(status.steps).forEach(([step, stepStatus]) => {
                const icon = getStatusIcon(stepStatus);
                console.log(`  ${icon} ${step}: ${stepStatus}`);
            });

            // Display results if available
            if (status.results.analysis) {
                console.log('\n🔍 Analysis Results:');
                console.log('  ✅ Document analysis completed');
            }

            if (status.results.gdpr) {
                console.log('\n⚖️ GDPR Results:');
                console.log('  Decision:', status.results.gdpr.gdprDecision || 'Unknown');
                console.log('  Personal Data Found:', status.results.gdpr.personalDataFound ? status.results.gdpr.personalDataFound.join(', ') : 'None');
                console.log('  Sensitive Data:', status.results.gdpr.sensitiveDataDetected ? 'Yes' : 'No');
                console.log('  DPO Notification:', status.results.gdpr.notifyDPO ? 'Required' : 'Not required');
            }

            if (status.results.sharing) {
                console.log('\n📤 Sharing Results:');
                console.log('  Status:', status.results.sharing.status || 'Completed');
                console.log('  Shared with:', status.sharingEmails ? status.sharingEmails.join(', ') : 'No emails');
                console.log('  Access Level:', status.results.sharing.accessLevel || 'Reader');
            }

            // Check if processing is complete
            if (status.status === 'completed') {
                console.log('\n🎉 Processing completed successfully!');
                break;
            } else if (status.status === 'failed') {
                console.log('\n❌ Processing failed!');
                if (status.error) {
                    console.log('Error:', status.error);
                }
                break;
            }

            attempts++;
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

        } catch (error) {
            console.error('❌ Error checking status:', error.message);
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    if (attempts >= maxAttempts) {
        console.log('\n⏰ Timeout: Processing took too long');
    }
}

function getStatusIcon(status) {
    switch (status) {
        case 'completed': return '✅';
        case 'processing': return '🔄';
        case 'failed': return '❌';
        case 'skipped': return '⏭️';
        default: return '⏳';
    }
}

// Run the test
if (require.main === module) {
    testUnifiedDocumentAgent().catch(console.error);
}

module.exports = { testUnifiedDocumentAgent };
