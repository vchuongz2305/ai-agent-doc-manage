const axios = require('axios');

async function testAPIConnection() {
    console.log('🧪 Testing API Connection...\n');

    try {
        // Test 1: Check if backend is running
        console.log('1️⃣ Testing Backend API (port 5000)...');
        const backendResponse = await axios.get('http://localhost:5000/api/document/status/test123');
        console.log('✅ Backend is running');
        console.log('📊 Response:', backendResponse.data);
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ Backend not running on port 5000');
            console.log('💡 Please start backend: npm start');
        } else {
            console.log('⚠️ Backend error:', error.message);
        }
    }

    try {
        // Test 2: Check if frontend is running
        console.log('\n2️⃣ Testing Frontend (port 3000)...');
        const frontendResponse = await axios.get('http://localhost:3000');
        console.log('✅ Frontend is running');
        console.log('📊 Status:', frontendResponse.status);
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ Frontend not running on port 3000');
            console.log('💡 Please start frontend: cd frontend && npm run dev');
        } else {
            console.log('⚠️ Frontend error:', error.message);
        }
    }

    // Test 3: Check API endpoints
    console.log('\n3️⃣ Testing API Endpoints...');
    const endpoints = [
        'http://localhost:5000/api/document/process',
        'http://localhost:5000/api/document/status/test123'
    ];

    for (const endpoint of endpoints) {
        try {
            const response = await axios.get(endpoint);
            console.log(`✅ ${endpoint} - Status: ${response.status}`);
        } catch (error) {
            if (error.response) {
                console.log(`⚠️ ${endpoint} - Status: ${error.response.status}`);
            } else {
                console.log(`❌ ${endpoint} - Error: ${error.message}`);
            }
        }
    }

    console.log('\n📋 Summary:');
    console.log('- Backend (API): http://localhost:5000');
    console.log('- Frontend (UI): http://localhost:3000');
    console.log('- Proxy: Frontend → Backend API calls');
    console.log('\n🚀 To start both:');
    console.log('Terminal 1: npm start (Backend)');
    console.log('Terminal 2: cd frontend && npm run dev (Frontend)');
}

// Run the test
if (require.main === module) {
    testAPIConnection().catch(console.error);
}

module.exports = { testAPIConnection };
