const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Test PDF download và validation
async function testPDFDownload() {
  const fileName = '1764654705627-Thông_tin_Trần_hà_Duy.pdf';
  const encodedFileName = encodeURIComponent(fileName);
  
  console.log('🔍 Testing PDF Download...\n');
  
  // 1. Check original file
  const originalPath = path.join(__dirname, '..', 'uploads', fileName);
  console.log('1️⃣ Original file on disk:');
  if (fs.existsSync(originalPath)) {
    const stats = fs.statSync(originalPath);
    const buffer = fs.readFileSync(originalPath);
    console.log(`   ✅ Exists: ${stats.size} bytes`);
    console.log(`   First bytes: ${buffer.slice(0, 10).toString('hex')}`);
    console.log(`   Is PDF: ${buffer.slice(0, 4).toString() === '%PDF' ? '✅' : '❌'}`);
  } else {
    console.log('   ❌ File not found');
    return;
  }
  
  // 2. Test download from localhost
  console.log('\n2️⃣ Download from localhost:5000...');
  try {
    const localUrl = `http://localhost:5000/uploads/${encodedFileName}`;
    const response = await axios.get(localUrl, {
      responseType: 'arraybuffer',
      timeout: 10000
    });
    
    const downloadedBuffer = Buffer.from(response.data);
    console.log(`   ✅ Downloaded: ${downloadedBuffer.length} bytes`);
    console.log(`   Content-Type: ${response.headers['content-type']}`);
    console.log(`   First bytes: ${downloadedBuffer.slice(0, 10).toString('hex')}`);
    console.log(`   Is PDF: ${downloadedBuffer.slice(0, 4).toString() === '%PDF' ? '✅' : '❌'}`);
    
    // Save to temp file to test
    const tempPath = path.join(__dirname, '..', 'temp-downloaded.pdf');
    fs.writeFileSync(tempPath, downloadedBuffer);
    console.log(`   ✅ Saved to: ${tempPath}`);
    
    // Check file type
    const { execSync } = require('child_process');
    try {
      const fileType = execSync(`file "${tempPath}"`, { encoding: 'utf8' }).trim();
      console.log(`   File type: ${fileType}`);
    } catch (e) {
      console.log(`   ⚠️  Could not check file type: ${e.message}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Content-Type: ${error.response.headers['content-type']}`);
      // Check if it's HTML
      if (error.response.headers['content-type']?.includes('text/html')) {
        console.log(`   ⚠️  Response is HTML, not PDF!`);
        const html = Buffer.from(error.response.data).toString('utf8').substring(0, 200);
        console.log(`   HTML preview: ${html}`);
      }
    }
  }
  
  // 3. Test download from domain
  console.log('\n3️⃣ Download from domain: https://n8n.aidocmanageagent.io.vn...');
  try {
    const domainUrl = `https://n8n.aidocmanageagent.io.vn/uploads/${encodedFileName}`;
    const response = await axios.get(domainUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      validateStatus: () => true
    });
    
    const downloadedBuffer = Buffer.from(response.data);
    console.log(`   Status: ${response.status}`);
    console.log(`   Downloaded: ${downloadedBuffer.length} bytes`);
    console.log(`   Content-Type: ${response.headers['content-type']}`);
    console.log(`   First bytes: ${downloadedBuffer.slice(0, 20).toString('hex')}`);
    console.log(`   First chars: ${downloadedBuffer.slice(0, 50).toString()}`);
    
    if (downloadedBuffer.slice(0, 4).toString() === '%PDF') {
      console.log(`   ✅ Is valid PDF!`);
    } else {
      console.log(`   ❌ Not a valid PDF!`);
      // Check if it's HTML
      const text = downloadedBuffer.slice(0, 200).toString('utf8');
      if (text.includes('<html') || text.includes('<!DOCTYPE')) {
        console.log(`   ⚠️  Response is HTML, not PDF!`);
        console.log(`   HTML preview: ${text.substring(0, 200)}`);
      }
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

testPDFDownload().catch(console.error);

