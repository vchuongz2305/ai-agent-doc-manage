const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// Test configuration
const API_BASE_URL = 'http://localhost:3000';
const TEST_FILE_PATH = 'Thông tin Trần hà Duy.pdf';

async function testParameterFlow() {
    console.log('🧪 Testing Parameter Flow from Web Interface...\n');

    try {
        // Check if test file exists
        if (!fs.existsSync(TEST_FILE_PATH)) {
            console.log('❌ Test file not found:', TEST_FILE_PATH);
            console.log('Please ensure the PDF file exists in the current directory');
            return;
        }

        // Test data from web interface
        const testData = {
            userId: 'test_user_123',
            department: 'HR',
            sharingEmails: 'danghongnguyen0175@gmail.com,tranhaduy204@gmail.com,congbui@gmail.com'
        };

        console.log('📊 Test Parameters:');
        console.log('- User ID:', testData.userId);
        console.log('- Department:', testData.department);
        console.log('- Sharing Emails:', testData.sharingEmails);
        console.log('- File:', TEST_FILE_PATH);
        console.log('');

        // Create form data
        const formData = new FormData();
        formData.append('file', fs.createReadStream(TEST_FILE_PATH));
        formData.append('userId', testData.userId);
        formData.append('department', testData.department);
        formData.append('sharingEmails', testData.sharingEmails);

        console.log('📤 Sending request to unified API...');

        // Upload document with parameters
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

            // Monitor processing status
            console.log('\n📊 Monitoring processing status...');
            await monitorParameterFlow(processingId);

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

async function monitorParameterFlow(processingId) {
    const maxAttempts = 30; // 1 minute with 2-second intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/document/status/${processingId}`);
            const status = response.data;

            console.log(`\n📊 Status Check ${attempts + 1}:`);
            console.log('Overall Status:', status.status);
            console.log('File:', status.fileName);
            console.log('User ID:', status.userId);
            console.log('Department:', status.department);
            console.log('Sharing Emails:', status.sharingEmails);

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
                console.log('  📄 File processed:', status.results.analysis.fileName || 'Unknown');
            }

            if (status.results.gdpr) {
                console.log('\n⚖️ GDPR Results:');
                console.log('  Decision:', status.results.gdpr.gdprDecision || 'Unknown');
                console.log('  Personal Data Found:', status.results.gdpr.personalDataFound ? status.results.gdpr.personalDataFound.join(', ') : 'None');
                console.log('  Sensitive Data:', status.results.gdpr.sensitiveDataDetected ? 'Yes' : 'No');
                console.log('  DPO Notification:', status.results.gdpr.notifyDPO ? 'Required' : 'Not required');
                console.log('  Legal Basis:', status.results.gdpr.legalBasis || 'Not specified');
            }

            if (status.results.sharing) {
                console.log('\n📤 Sharing Results:');
                console.log('  Status:', status.results.sharing.status || 'Completed');
                console.log('  Shared with:', status.sharingEmails ? status.sharingEmails.join(', ') : 'No emails');
                console.log('  Access Level:', status.results.sharing.accessLevel || 'Reader');
                console.log('  Expiration:', status.results.sharing.expirationDays || 30, 'days');
            }

            // Check if processing is complete
            if (status.status === 'completed') {
                console.log('\n🎉 Processing completed successfully!');
                console.log('\n📋 Final Parameter Summary:');
                console.log('  User ID:', status.userId);
                console.log('  Department:', status.department);
                console.log('  Sharing Emails:', status.sharingEmails);
                console.log('  File Name:', status.fileName);
                console.log('  File Size:', (status.fileSize / 1024 / 1024).toFixed(2), 'MB');
                console.log('  MIME Type:', status.mimeType);
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
    testParameterFlow().catch(console.error);
}

module.exports = { testParameterFlow };
