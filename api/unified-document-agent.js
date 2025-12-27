// Load path module first (needed for .env path resolution)
const path = require('path');

// Load environment variables from project root .env file
// This ensures all files use the same .env file
require('../load-env');

const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;
const { uploadFileToCloudinary } = require('./cloudinary-upload');
const { downloadFileFromCloudinary, downloadFileFromCloudinaryUrl } = require('./cloudinary-download');

// Configure Cloudinary (đã được config trong cloudinary-upload, nhưng cần config lại để tạo signed URL)
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const app = express();
const PORT = 5000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

// Middleware
app.use(express.json());
// CORS for frontend
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'https://ui-ai-agent-doc-manage.vercel.app'
  ];
  const origin = req.headers.origin;
  
  // Log để debug (có thể remove sau khi production ổn định)
  if (origin) {
    console.log('🌐 CORS Request - Origin:', origin);
    console.log('   Allowed origins:', allowedOrigins);
    console.log('   Match:', allowedOrigins.includes(origin));
  }
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    console.log('✅ CORS allowed for:', origin);
  } else if (origin) {
    console.log('⚠️ CORS blocked for:', origin);
    // Không set header nếu không match - browser sẽ block request
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true'); // Nếu cần credentials
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Support multiple file formats
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format'), false);
    }
  }
});

// N8N Webhook URLs
const N8N_BASE_URL = 'https://n8n.aidocmanageagent.io.vn';
const FLOW1_URL = `${N8N_BASE_URL}/webhook/document-analyzer`;
const FLOW2_URL = `${N8N_BASE_URL}/webhook/document-management`;
const FLOW3_URL = `${N8N_BASE_URL}/webhook/gdpr-compliance`;

// N8N API Configuration (for activating workflows)
// Set these in environment variables or config
const N8N_API_KEY = process.env.N8N_API_KEY || '';
const N8N_USERNAME = process.env.N8N_USERNAME || '';
const N8N_PASSWORD = process.env.N8N_PASSWORD || '';
const N8N_WORKFLOW_IDS = {
  flow1: process.env.N8N_WORKFLOW_ID_FLOW1 || '9ucTmgO083P7qCGQ', // From Flow 1.json
  flow2: process.env.N8N_WORKFLOW_ID_FLOW2 || '',
  flow3: process.env.N8N_WORKFLOW_ID_FLOW3 || ''
};

// Debug: Log API key status (only show first/last few chars for security)
if (N8N_API_KEY) {
  const keyPreview = N8N_API_KEY.length > 20 
    ? `${N8N_API_KEY.substring(0, 10)}...${N8N_API_KEY.substring(N8N_API_KEY.length - 10)}`
    : '***';
  console.log(`✅ N8N API Key loaded: ${keyPreview}`);
} else {
  console.warn('⚠️ N8N_API_KEY not found in environment variables');
  console.warn('   Please check .env file exists and contains N8N_API_KEY');
}

// Function to activate N8N workflow via API
async function activateN8NWorkflow(workflowId, flowName = 'flow1') {
  try {
    // Try API key authentication first
    if (N8N_API_KEY) {
      // Try with X-N8N-API-KEY header first
      try {
        const response = await axios.post(
          `${N8N_BASE_URL}/api/v1/workflows/${workflowId}/activate`,
          { active: true },
          {
            headers: {
              'X-N8N-API-KEY': N8N_API_KEY,
              'Content-Type': 'application/json'
            },
            timeout: 5000
          }
        );
        console.log(`✅ Workflow ${flowName} activated via API key (X-N8N-API-KEY)`);
        return true;
      } catch (error1) {
        // If X-N8N-API-KEY fails, try Bearer token
        if (error1.response?.status === 401 || error1.response?.status === 403) {
          try {
            const response = await axios.post(
              `${N8N_BASE_URL}/api/v1/workflows/${workflowId}/activate`,
              { active: true },
              {
                headers: {
                  'Authorization': `Bearer ${N8N_API_KEY}`,
                  'Content-Type': 'application/json'
                },
                timeout: 5000
              }
            );
            console.log(`✅ Workflow ${flowName} activated via API key (Bearer)`);
            return true;
          } catch (error2) {
            console.error(`❌ Both authentication methods failed:`, {
              method1: error1.response?.status,
              method2: error2.response?.status,
              message: error2.message
            });
            throw error2;
          }
        } else {
          throw error1;
        }
      }
    }
    
    // Try username/password authentication
    if (N8N_USERNAME && N8N_PASSWORD) {
      // First, get auth token
      const authResponse = await axios.post(
        `${N8N_BASE_URL}/rest/login`,
        {
          email: N8N_USERNAME,
          password: N8N_PASSWORD
        },
        { timeout: 5000 }
      );
      
      const cookie = authResponse.headers['set-cookie'];
      if (cookie) {
        const response = await axios.post(
          `${N8N_BASE_URL}/api/v1/workflows/${workflowId}/activate`,
          { active: true },
          {
            headers: {
              'Cookie': cookie,
              'Content-Type': 'application/json'
            },
            timeout: 5000
          }
        );
        console.log(`✅ Workflow ${flowName} activated via username/password`);
        return true;
      }
    }
    
    console.warn(`⚠️ Cannot activate workflow ${flowName}: No N8N credentials configured`);
    return false;
  } catch (error) {
    // Don't fail the request if activation fails, just log it
    console.warn(`⚠️ Failed to activate workflow ${flowName}:`, error.message);
    return false;
  }
}

// Result webhook URLs
const RESULT_WEBHOOKS = {
  flow1: 'https://api.aidocmanageagent.io.vn/webhook/flow1-result',
  flow2: 'https://api.aidocmanageagent.io.vn/webhook/flow2-result',
  flow3: 'https://api.aidocmanageagent.io.vn/webhook/flow3-result'
};

// Store processing status
const processingStatus = new Map();

// PostgreSQL Connection Pool
const pgPool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DATABASE || 'document_management',
  user: process.env.POSTGRES_USER || 'doc_user',
  password: process.env.POSTGRES_PASSWORD || '',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test PostgreSQL connection on startup
pgPool.on('connect', () => {
  console.log('✅ PostgreSQL connection established');
});

pgPool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL error:', err);
});

// Test connection
pgPool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.warn('⚠️ PostgreSQL connection test failed:', err.message);
    console.warn('   Make sure PostgreSQL is running and credentials are correct');
  } else {
    console.log('✅ PostgreSQL connection test successful');
  }
});

// Unified Document Processing Endpoint
// GET handler - returns endpoint information
app.get('/api/document/process', (req, res) => {
  res.json({
    message: 'This endpoint accepts POST requests only',
    method: 'POST',
    description: 'Upload and process documents',
    requiredFields: {
      file: 'File to upload (multipart/form-data)',
      userId: 'User ID (optional)',
      department: 'Department (optional)',
      sharingEmails: 'Comma-separated email addresses (optional)'
    },
    example: {
      url: '/api/document/process',
      method: 'POST',
      contentType: 'multipart/form-data',
      body: {
        file: '<file>',
        userId: 'user123',
        department: 'IT',
        sharingEmails: 'user1@example.com,user2@example.com'
      }
    }
  });
});

// POST handler - processes document uploads
app.post('/api/document/process', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { userId, department, sharingEmails } = req.body;
    
    console.log('📥 Received request:', {
      hasFile: !!file,
      body: req.body,
      fileInfo: file ? {
        name: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        path: file.path
      } : null
    });
    
    // Validate required data
    if (!userId) {
      console.warn('⚠️ Warning: userId is missing, using default');
    }
    if (!department) {
      console.warn('⚠️ Warning: department is missing');
    }
    
    if (!file) {
      console.error('❌ No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate unique processing ID
    const processingId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize processing status
    processingStatus.set(processingId, {
      id: processingId,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      userId: userId,
      department: department,
      sharingEmails: sharingEmails ? sharingEmails.split(',') : [],
      status: 'processing',
      steps: {
        analysis: 'pending',
        gdpr: 'pending',
        sharing: 'pending'
      },
      results: {
        analysis: null,
        gdpr: null,
        sharing: null
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Step 1: Document Analysis (Flow 1)
    console.log(`📤 Starting analysis for ${processingId}`);
    console.log(`🔗 Webhook URL: ${FLOW1_URL}`);
    
    // Try to activate workflow before sending request
    const workflowId = N8N_WORKFLOW_IDS.flow1;
    if (workflowId) {
      console.log(`🔄 Attempting to activate workflow Flow 1 (ID: ${workflowId})...`);
      const activated = await activateN8NWorkflow(workflowId, 'flow1');
      if (activated) {
        // Wait longer for N8N to register the webhook (webhook registration takes time)
        console.log(`⏳ Waiting 5 seconds for webhook to be registered...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Verify workflow is active
        try {
          const statusResponse = await axios.get(
            `${N8N_BASE_URL}/api/v1/workflows/${workflowId}`,
            {
              headers: getN8NHeaders(),
              timeout: 5000
            }
          );
          if (statusResponse.data && statusResponse.data.active) {
            console.log(`✅ Workflow confirmed active, webhook should be ready`);
          }
        } catch (statusError) {
          console.warn(`⚠️ Could not verify workflow status:`, statusError.message);
        }
      }
    }
    
    // Step 1.5: Upload file to Cloudinary (BẮT BUỘC)
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📤 [CLOUDINARY] Uploading file to Cloudinary for ${processingId}...`);
    console.log(`   File: ${file.originalname}`);
    console.log(`   Size: ${file.size} bytes`);
    console.log(`   Path: ${file.path}`);
    console.log(`   File exists: ${fs.existsSync(file.path)}`);
    
    let cloudinaryResult = null;
    let cloudinaryUrl = null;
    let cloudinaryPublicId = null;
    
    try {
      console.log(`   [CLOUDINARY] Calling uploadFileToCloudinary...`);
      cloudinaryResult = await uploadFileToCloudinary(
        file.path,
        processingId,
        file.originalname
      );
      
      console.log(`   [CLOUDINARY] Upload result:`, JSON.stringify({
        success: cloudinaryResult?.success,
        has_secure_url: !!cloudinaryResult?.secure_url,
        has_public_id: !!cloudinaryResult?.public_id
      }, null, 2));
      
      if (!cloudinaryResult) {
        throw new Error('Cloudinary upload returned null/undefined');
      }
      
      if (!cloudinaryResult.secure_url) {
        console.error(`   [CLOUDINARY] Result:`, JSON.stringify(cloudinaryResult, null, 2));
        throw new Error('Cloudinary upload returned invalid result - no secure_url');
      }
      
      cloudinaryUrl = cloudinaryResult.secure_url;
      cloudinaryPublicId = cloudinaryResult.public_id;
      
      console.log(`✅ [CLOUDINARY] File uploaded successfully!`);
      console.log(`   Public ID: ${cloudinaryPublicId}`);
      console.log(`   URL: ${cloudinaryUrl}`);
      console.log(`   Resource Type: ${cloudinaryResult.resource_type || 'N/A'}`);
      console.log(`   Format: ${cloudinaryResult.format || 'N/A'}`);
      console.log(`   Bytes: ${cloudinaryResult.bytes || 'N/A'}`);
      console.log(`   Access Mode: ${cloudinaryResult.access_mode || 'public (default)'}`);
      console.log(`   URL contains 'cloudinary.com': ${cloudinaryUrl.includes('cloudinary.com')}`);
      
      // Verify resource_type is correct for PDFs
      const isPdf = file.originalname.toLowerCase().endsWith('.pdf');
      if (isPdf && cloudinaryResult.resource_type !== 'raw') {
        console.warn(`⚠️  WARNING: PDF file uploaded with resource_type "${cloudinaryResult.resource_type}" instead of "raw"`);
      }
      
      // Update processing status with Cloudinary info
      const currentStatus = processingStatus.get(processingId);
      if (currentStatus) {
        currentStatus.cloudinaryUrl = cloudinaryUrl;
        currentStatus.cloudinaryPublicId = cloudinaryPublicId;
        currentStatus.cloudinaryResourceType = cloudinaryResult.resource_type || 'raw';
        processingStatus.set(processingId, currentStatus);
      }
      
    } catch (cloudinaryError) {
      console.error(`\n${'='.repeat(60)}`);
      console.error(`❌ [CLOUDINARY] CRITICAL ERROR: Failed to upload file to Cloudinary!`);
      console.error(`   Error message: ${cloudinaryError.message}`);
      console.error(`   Error stack: ${cloudinaryError.stack}`);
      console.error(`   File path: ${file.path}`);
      console.error(`   File exists: ${fs.existsSync(file.path)}`);
      console.error(`${'='.repeat(60)}\n`);
      
      // KHÔNG tiếp tục với local URL - throw error để frontend biết
      return res.status(500).json({ 
        error: 'Failed to upload file to Cloudinary',
        message: cloudinaryError.message,
        processingId: processingId,
        details: cloudinaryError.stack
      });
    }
    
    // Đảm bảo có Cloudinary URL trước khi tiếp tục
    if (!cloudinaryUrl) {
      console.error(`\n${'='.repeat(60)}`);
      console.error(`❌ [CLOUDINARY] CRITICAL: Cloudinary URL is missing after upload!`);
      console.error(`   cloudinaryResult:`, JSON.stringify(cloudinaryResult, null, 2));
      console.error(`${'='.repeat(60)}\n`);
      return res.status(500).json({ 
        error: 'Cloudinary URL is missing after upload',
        processingId: processingId
      });
    }
    
    // Verify URL format
    if (!cloudinaryUrl.includes('cloudinary.com')) {
      console.error(`\n${'='.repeat(60)}`);
      console.error(`❌ [CLOUDINARY] CRITICAL: Cloudinary URL format is invalid!`);
      console.error(`   URL: ${cloudinaryUrl}`);
      console.error(`${'='.repeat(60)}\n`);
      return res.status(500).json({ 
        error: 'Invalid Cloudinary URL format',
        url: cloudinaryUrl,
        processingId: processingId
      });
    }
    
    console.log(`${'='.repeat(60)}\n`);
    
    // Tạo signed URL cho n8n để download (tránh lỗi 401)
    // QUAN TRỌNG: Phải dùng đúng resource_type từ upload result
    let downloadUrl = cloudinaryUrl; // Default dùng unsigned URL
    try {
      // Lấy resource_type từ upload result (fallback về 'raw' nếu không có)
      const actualResourceType = cloudinaryResult?.resource_type || 'raw';
      
      console.log(`   Creating signed URL with resource_type: ${actualResourceType}`);
      console.log(`   Public ID: ${cloudinaryPublicId}`);
      
      const signedUrl = cloudinary.url(cloudinaryPublicId, {
        resource_type: actualResourceType, // Dùng resource_type từ upload result
        secure: true,
        sign_url: true, // Signed URL để bypass access control
        type: 'upload' // Đảm bảo là upload type
      });
      
      downloadUrl = signedUrl;
      console.log(`✅ Created signed URL for n8n download`);
      console.log(`   Resource Type: ${actualResourceType}`);
      console.log(`   Signed URL: ${signedUrl.substring(0, 100)}...`);
      
      // Verify signed URL format
      if (!signedUrl.includes('cloudinary.com')) {
        console.warn(`⚠️  Signed URL format seems invalid, using unsigned URL`);
        downloadUrl = cloudinaryUrl;
      }
    } catch (signError) {
      console.warn(`⚠️  Could not create signed URL, using unsigned URL: ${signError.message}`);
      console.warn(`   Error details:`, signError);
      // Fallback to unsigned URL
      downloadUrl = cloudinaryUrl;
    }
    
    // Prepare file data for webhook
    const analysisData = {
      file: {
        name: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        url: downloadUrl,  // Dùng signed URL cho n8n download
        cloudinary_url: downloadUrl,  // Signed URL (tránh 401)
        cloudinary_public_id: cloudinaryPublicId,  // Public ID để dự phòng
        cloudinary_unsigned_url: cloudinaryUrl  // Giữ unsigned URL để reference
      },
      userId: userId,
      department: department,
      processingId: processingId
    };

    // Verify Cloudinary URL is valid before sending
    if (!analysisData.file.cloudinary_url || !analysisData.file.cloudinary_url.includes('cloudinary.com')) {
      console.error(`❌ CRITICAL: Invalid Cloudinary URL!`);
      console.error(`   URL: ${analysisData.file.cloudinary_url}`);
      return res.status(500).json({ 
        error: 'Invalid Cloudinary URL',
        processingId: processingId
      });
    }
    
    console.log(`📋 Sending data to webhook:`, {
      processingId: analysisData.processingId,
      fileName: analysisData.file.name,
      fileSize: analysisData.file.size,
      fileUrl: analysisData.file.url,
      cloudinary_url: analysisData.file.cloudinary_url,
      cloudinary_public_id: analysisData.file.cloudinary_public_id,
      userId: analysisData.userId,
      department: analysisData.department
    });

    try {
      const analysisResponse = await axios.post(FLOW1_URL, analysisData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000, // 30 seconds timeout
        validateStatus: function (status) {
          return status >= 200 && status < 500; // Accept 2xx and 4xx as valid responses
        }
      });
      
      if (analysisResponse.status === 404) {
        console.error(`❌ Webhook not found (404) for ${processingId}`);
        console.error(`🔄 Attempting to auto-activate workflow...`);
        
        // Try to auto-activate workflow when 404 error occurs
        const workflowId = N8N_WORKFLOW_IDS.flow1;
        if (workflowId) {
          const activated = await activateN8NWorkflow(workflowId, 'flow1');
          if (activated) {
            console.log(`✅ Workflow activated. Waiting for webhook to be registered...`);
            
            // Retry với exponential backoff (5s, 10s, 15s)
            let retrySuccess = false;
            const retryDelays = [5000, 10000, 15000];
            
            for (let attempt = 0; attempt < retryDelays.length; attempt++) {
              const delay = retryDelays[attempt];
              console.log(`⏳ Attempt ${attempt + 1}/${retryDelays.length}: Waiting ${delay/1000}s before retry...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              
              try {
                console.log(`🔄 Retrying webhook request (attempt ${attempt + 1})...`);
                const retryResponse = await axios.post(FLOW1_URL, analysisData, {
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  timeout: 30000,
                  validateStatus: function (status) {
                    return status >= 200 && status < 500;
                  }
                });
                
                if (retryResponse.status >= 200 && retryResponse.status < 300) {
                  console.log(`✅ Webhook retry successful for ${processingId} (attempt ${attempt + 1})`);
                  processingStatus.get(processingId).steps.analysis = 'completed';
                  processingStatus.get(processingId).results.analysis = retryResponse.data;
                  processingStatus.get(processingId).updatedAt = new Date().toISOString();
                  retrySuccess = true;
                  break;
                } else if (retryResponse.status === 404) {
                  console.warn(`⚠️ Attempt ${attempt + 1} still returns 404, will retry...`);
                  if (attempt === retryDelays.length - 1) {
                    // Last attempt failed
                    console.error(`❌ All retry attempts failed. Webhook still returns 404.`);
                    console.error(`💡 CRITICAL: Webhook may not be properly configured in N8N.`);
                    console.error(`   Please:`);
                    console.error(`   1. Go to N8N: https://n8n.aidocmanageagent.io.vn`);
                    console.error(`   2. Open workflow "Test 2" (ID: ${workflowId})`);
                    console.error(`   3. Click on Webhook node and TEST it`);
                    console.error(`   4. Save the workflow`);
                    console.error(`   5. Ensure workflow is ACTIVE`);
                    processingStatus.get(processingId).steps.analysis = 'failed';
                    processingStatus.get(processingId).error = 'Webhook not found (404) after all retry attempts. Please test and save webhook in N8N.';
                  }
                } else if (retryResponse.status === 500) {
                  console.error(`❌ Workflow execution error (500) on attempt ${attempt + 1}`);
                  console.error(`   Response data:`, JSON.stringify(retryResponse.data, null, 2));
                  console.error(`💡 Check N8N execution logs for workflow errors:`);
                  console.error(`   1. Go to N8N: https://n8n.aidocmanageagent.io.vn`);
                  console.error(`   2. Open workflow "Test 2"`);
                  console.error(`   3. Check "Executions" tab for error details`);
                  console.error(`   4. Common issues:`);
                  console.error(`      - Missing credentials in nodes`);
                  console.error(`      - Invalid data format`);
                  console.error(`      - Node execution errors`);
                  if (attempt === retryDelays.length - 1) {
                    processingStatus.get(processingId).steps.analysis = 'failed';
                    processingStatus.get(processingId).error = `Workflow execution error (500): ${JSON.stringify(retryResponse.data)}`;
                  }
                } else {
                  throw new Error(`Retry failed with status ${retryResponse.status}`);
                }
              } catch (retryError) {
                if (attempt === retryDelays.length - 1) {
                  // Last attempt
                  console.error(`❌ All retry attempts failed:`, retryError.message);
                  if (retryError.response) {
                    console.error(`   Response status: ${retryError.response.status}`);
                    console.error(`   Response data:`, retryError.response.data);
                  }
                  processingStatus.get(processingId).steps.analysis = 'failed';
                  processingStatus.get(processingId).error = `Webhook retry failed after ${retryDelays.length} attempts: ${retryError.message}`;
                } else {
                  console.warn(`⚠️ Attempt ${attempt + 1} failed: ${retryError.message}, will retry...`);
                }
              }
            }
            
            if (!retrySuccess) {
              console.error(`💡 Webhook registration may take longer. Please manually test webhook in N8N.`);
            }
          } else {
            console.error(`💡 Auto-activation failed. Possible issues:`);
            console.error(`   1. N8N API credentials not configured`);
            console.error(`   2. Webhook path incorrect: ${FLOW1_URL}`);
            console.error(`   3. N8N workflow not running`);
            console.error(`   📋 Please check N8N dashboard and activate the workflow manually`);
            processingStatus.get(processingId).steps.analysis = 'failed';
            processingStatus.get(processingId).error = 'Webhook not found (404). Please activate workflow in N8N.';
          }
        } else {
          console.error(`💡 Workflow ID not configured. Please set N8N_WORKFLOW_ID_FLOW1`);
          processingStatus.get(processingId).steps.analysis = 'failed';
          processingStatus.get(processingId).error = 'Webhook not found (404). Workflow ID not configured.';
        }
      } else if (analysisResponse.status === 500) {
        console.error(`❌ Workflow execution error (500) for ${processingId}`);
        console.error(`   Response data:`, JSON.stringify(analysisResponse.data, null, 2));
        console.error(`💡 Check N8N execution logs:`);
        console.error(`   1. Go to N8N: https://n8n.aidocmanageagent.io.vn`);
        console.error(`   2. Open workflow "Test 2" (ID: ${N8N_WORKFLOW_IDS.flow1})`);
        console.error(`   3. Check "Executions" tab for error details`);
        processingStatus.get(processingId).steps.analysis = 'failed';
        processingStatus.get(processingId).error = `Workflow execution error (500): ${JSON.stringify(analysisResponse.data)}`;
      } else if (analysisResponse.status >= 200 && analysisResponse.status < 300) {
        console.log(`✅ Webhook response received for ${processingId}:`, {
          status: analysisResponse.status,
          statusText: analysisResponse.statusText,
          hasData: !!analysisResponse.data
        });
        
        processingStatus.get(processingId).steps.analysis = 'completed';
        processingStatus.get(processingId).results.analysis = analysisResponse.data;
        // Lưu docx_url nếu có trong response
        if (analysisResponse.data && analysisResponse.data.docx_url) {
          processingStatus.get(processingId).docx_url = analysisResponse.data.docx_url;
        }
        processingStatus.get(processingId).updatedAt = new Date().toISOString();
      } else {
        console.warn(`⚠️ Webhook returned status ${analysisResponse.status} for ${processingId}`);
        processingStatus.get(processingId).steps.analysis = 'failed';
        processingStatus.get(processingId).error = `Webhook returned status ${analysisResponse.status}`;
      }
    } catch (error) {
      console.error(`❌ Analysis failed for ${processingId}:`, {
        message: error.message,
        code: error.code,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : 'No response',
        url: FLOW1_URL
      });
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        console.error(`💡 Cannot connect to N8N server: ${N8N_BASE_URL}`);
        console.error(`   Please check if N8N server is accessible`);
      }
      
      processingStatus.get(processingId).steps.analysis = 'failed';
      processingStatus.get(processingId).error = error.message;
    }

    // Step 2: GDPR Compliance Check (Flow 3)
    console.log(`Starting GDPR check for ${processingId}`);
    const gdprData = {
      ...analysisData,
      analysisResults: processingStatus.get(processingId).results.analysis
    };

    try {
      const gdprResponse = await axios.post(FLOW3_URL, gdprData);
      console.log(`GDPR check completed for ${processingId}`);
      
      processingStatus.get(processingId).steps.gdpr = 'completed';
      processingStatus.get(processingId).results.gdpr = gdprResponse.data;
      processingStatus.get(processingId).updatedAt = new Date().toISOString();
    } catch (error) {
      console.error(`GDPR check failed for ${processingId}:`, error.message);
      processingStatus.get(processingId).steps.gdpr = 'failed';
    }

    // Step 3: Document Sharing (Flow 2) - Only if GDPR allows
    const gdprResult = processingStatus.get(processingId).results.gdpr;
    if (gdprResult && gdprResult.gdprDecision !== 'delete') {
      console.log(`Starting document sharing for ${processingId}`);
      const sharingData = {
        ...analysisData,
        analysisResults: processingStatus.get(processingId).results.analysis,
        gdprResults: processingStatus.get(processingId).results.gdpr,
        sharingEmails: sharingEmails ? sharingEmails.split(',') : []
      };

      try {
        const sharingResponse = await axios.post(FLOW2_URL, sharingData);
        console.log(`Document sharing completed for ${processingId}`);
        
        processingStatus.get(processingId).steps.sharing = 'completed';
        processingStatus.get(processingId).results.sharing = sharingResponse.data;
        processingStatus.get(processingId).status = 'completed';
        processingStatus.get(processingId).updatedAt = new Date().toISOString();
      } catch (error) {
        console.error(`Document sharing failed for ${processingId}:`, error.message);
        processingStatus.get(processingId).steps.sharing = 'failed';
      }
    } else {
      console.log(`Document sharing skipped for ${processingId} due to GDPR decision: ${gdprResult?.gdprDecision}`);
      processingStatus.get(processingId).steps.sharing = 'skipped';
      processingStatus.get(processingId).status = 'completed';
      processingStatus.get(processingId).updatedAt = new Date().toISOString();
    }

    res.json({
      success: true,
      processingId: processingId,
      status: processingStatus.get(processingId).status,
      message: 'Document processing initiated'
    });

  } catch (error) {
    console.error('❌ Error processing document:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get Processing Status
app.get('/api/document/status/:processingId', (req, res) => {
  const { processingId } = req.params;
  const status = processingStatus.get(processingId);
  
  if (!status) {
    return res.status(404).json({ error: 'Processing ID not found' });
  }
  
  // Trả về status với docx_url nếu có
  res.json({
    ...status,
    docx_url: status.docx_url || null
  });
});

// Get All Processing Status
app.get('/api/document/status', (req, res) => {
  const allStatus = Array.from(processingStatus.values());
  res.json(allStatus);
});

// ============================================
// N8N Workflow Management API Endpoints
// ============================================

// Helper function to get N8N API headers
function getN8NHeaders() {
  const headers = {
    'Content-Type': 'application/json',
    'accept': 'application/json'
  };
  
  if (N8N_API_KEY) {
    // Try both methods: X-N8N-API-KEY and Authorization Bearer
    // Some N8N versions use Bearer token
    headers['X-N8N-API-KEY'] = N8N_API_KEY;
    headers['Authorization'] = `Bearer ${N8N_API_KEY}`;
  }
  
  return headers;
}

// Helper function to make authenticated N8N API request
async function makeN8NAPIRequest(method, endpoint, data = null) {
  const headers = getN8NHeaders();
  const config = {
    method,
    url: `${N8N_BASE_URL}${endpoint}`,
    headers,
    timeout: 10000
  };
  
  if (data) {
    config.data = data;
  }
  
  try {
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    };
  }
}

// GET /api/n8n/workflows - List all workflows
app.get('/api/n8n/workflows', async (req, res) => {
  try {
    const { active } = req.query;
    let endpoint = '/api/v1/workflows';
    
    if (active !== undefined) {
      endpoint += `?active=${active === 'true'}`;
    }
    
    const result = await makeN8NAPIRequest('GET', endpoint);
    
    if (result.success) {
      res.json({
        success: true,
        workflows: result.data,
        count: Array.isArray(result.data) ? result.data.length : 1
      });
    } else {
      res.status(result.status || 500).json({
        success: false,
        error: result.error,
        message: 'Failed to fetch workflows from N8N'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/n8n/workflows/:id - Get workflow by ID
app.get('/api/n8n/workflows/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await makeN8NAPIRequest('GET', `/api/v1/workflows/${id}`);
    
    if (result.success) {
      res.json({
        success: true,
        workflow: result.data
      });
    } else {
      res.status(result.status || 404).json({
        success: false,
        error: result.error,
        message: `Workflow ${id} not found`
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/n8n/workflows/:id/activate - Activate workflow
app.post('/api/n8n/workflows/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await makeN8NAPIRequest('POST', `/api/v1/workflows/${id}/activate`, { active: true });
    
    if (result.success) {
      res.json({
        success: true,
        message: `Workflow ${id} activated successfully`,
        workflow: result.data
      });
    } else {
      res.status(result.status || 500).json({
        success: false,
        error: result.error,
        message: `Failed to activate workflow ${id}`
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/n8n/workflows/:id/deactivate - Deactivate workflow
app.post('/api/n8n/workflows/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await makeN8NAPIRequest('POST', `/api/v1/workflows/${id}/activate`, { active: false });
    
    if (result.success) {
      res.json({
        success: true,
        message: `Workflow ${id} deactivated successfully`,
        workflow: result.data
      });
    } else {
      res.status(result.status || 500).json({
        success: false,
        error: result.error,
        message: `Failed to deactivate workflow ${id}`
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/n8n/workflows/:id/status - Get workflow status (active/inactive)
app.get('/api/n8n/workflows/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await makeN8NAPIRequest('GET', `/api/v1/workflows/${id}`);
    
    if (result.success) {
      res.json({
        success: true,
        workflowId: id,
        active: result.data.active || false,
        name: result.data.name,
        status: result.data.active ? 'active' : 'inactive'
      });
    } else {
      res.status(result.status || 404).json({
        success: false,
        error: result.error,
        message: `Workflow ${id} not found`
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Webhook endpoints to receive results from N8N flows
// ============================================
// Cloudinary File Upload/Download Endpoints
// ============================================

/**
 * POST /api/cloudinary/upload
 * Upload file to Cloudinary
 * Body: multipart/form-data with 'file' field
 * Optional: processingId, fileName
 */
app.post('/api/cloudinary/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { processingId, fileName } = req.body;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Generate processing ID if not provided
    const procId = processingId || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fileNm = fileName || file.originalname;
    
    console.log(`📤 Uploading file to Cloudinary via API...`);
    console.log(`   Processing ID: ${procId}`);
    console.log(`   File: ${fileNm}`);
    
    const result = await uploadFileToCloudinary(
      file.path,
      procId,
      fileNm
    );
    
    // Clean up local file after upload
    try {
      fs.unlinkSync(file.path);
      console.log(`🗑️  Local file deleted: ${file.path}`);
    } catch (unlinkError) {
      console.warn(`⚠️  Could not delete local file: ${unlinkError.message}`);
    }
    
    res.json({
      success: true,
      processingId: procId,
      fileName: fileNm,
      cloudinary: {
        public_id: result.public_id,
        secure_url: result.secure_url,
        url: result.url,
        bytes: result.bytes,
        format: result.format,
        resource_type: result.resource_type,
        created_at: result.created_at
      }
    });
    
  } catch (error) {
    console.error('❌ Error uploading to Cloudinary:', error);
    res.status(500).json({
      error: 'Failed to upload file to Cloudinary',
      message: error.message
    });
  }
});

/**
 * GET /api/cloudinary/download/:publicId
 * Download file from Cloudinary by public_id
 * Query params: ?format=pdf (optional)
 */
app.get('/api/cloudinary/download/:publicId(*)', async (req, res) => {
  try {
    const publicId = req.params.publicId;
    
    if (!publicId) {
      return res.status(400).json({ error: 'Public ID is required' });
    }
    
    console.log(`📥 Downloading file from Cloudinary via API...`);
    console.log(`   Public ID: ${publicId}`);
    
    const result = await downloadFileFromCloudinary(publicId);
    
    // Determine content type
    const contentType = result.format === 'pdf' 
      ? 'application/pdf' 
      : (result.format ? `application/${result.format}` : 'application/octet-stream');
    
    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${publicId.split('/').pop()}"`);
    res.setHeader('Content-Length', result.size);
    
    // Send file buffer
    res.send(result.buffer);
    
  } catch (error) {
    console.error('❌ Error downloading from Cloudinary:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'File not found',
        message: error.message
      });
    }
    
    res.status(500).json({
      error: 'Failed to download file from Cloudinary',
      message: error.message
    });
  }
});

/**
 * GET /api/cloudinary/download-url
 * Download file from Cloudinary by URL
 * Query params: ?url=<cloudinary_url>
 */
app.get('/api/cloudinary/download-url', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    console.log(`📥 Downloading file from Cloudinary URL via API...`);
    console.log(`   URL: ${url}`);
    
    const result = await downloadFileFromCloudinaryUrl(url);
    
    // Determine content type from URL or default to PDF
    const contentType = url.includes('.pdf') 
      ? 'application/pdf' 
      : 'application/octet-stream';
    
    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="file.${url.split('.').pop()}"`);
    res.setHeader('Content-Length', result.size);
    
    // Send file buffer
    res.send(result.buffer);
    
  } catch (error) {
    console.error('❌ Error downloading from Cloudinary URL:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'File not found',
        message: error.message
      });
    }
    
    res.status(500).json({
      error: 'Failed to download file from Cloudinary',
      message: error.message
    });
  }
});

/**
 * GET /api/cloudinary/view/:publicId
 * View/display file from Cloudinary inline (for PDF viewing in browser)
 */
app.get('/api/cloudinary/view/:publicId(*)', async (req, res) => {
  try {
    const publicId = req.params.publicId;
    
    if (!publicId) {
      return res.status(400).json({ error: 'Public ID is required' });
    }
    
    console.log(`👁️  Viewing file from Cloudinary via API...`);
    console.log(`   Public ID: ${publicId}`);
    
    const result = await downloadFileFromCloudinary(publicId);
    
    // Determine content type
    const contentType = result.format === 'pdf' 
      ? 'application/pdf' 
      : (result.format ? `application/${result.format}` : 'application/octet-stream');
    
    // Set headers for inline display (not download)
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${publicId.split('/').pop()}"`);
    res.setHeader('Content-Length', result.size);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Send file buffer
    res.send(result.buffer);
    
  } catch (error) {
    console.error('❌ Error viewing from Cloudinary:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'File not found',
        message: error.message
      });
    }
    
    res.status(500).json({
      error: 'Failed to view file from Cloudinary',
      message: error.message
    });
  }
});

/**
 * GET /api/cloudinary/view-url
 * View/display file from Cloudinary URL inline
 * Query params: ?url=<cloudinary_url>
 */
app.get('/api/cloudinary/view-url', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    console.log(`👁️  Viewing file from Cloudinary URL via API...`);
    console.log(`   URL: ${url}`);
    
    const result = await downloadFileFromCloudinaryUrl(url);
    
    // Determine content type from URL or default to PDF
    const contentType = url.includes('.pdf') 
      ? 'application/pdf' 
      : 'application/octet-stream';
    
    // Set headers for inline display (not download)
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${url.split('/').pop()}"`);
    res.setHeader('Content-Length', result.size);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Send file buffer
    res.send(result.buffer);
    
  } catch (error) {
    console.error('❌ Error viewing from Cloudinary URL:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'File not found',
        message: error.message
      });
    }
    
    res.status(500).json({
      error: 'Failed to view file from Cloudinary',
      message: error.message
    });
  }
});

/**
 * GET /api/cloudinary/info/:publicId
 * Get file information from Cloudinary
 */
app.get('/api/cloudinary/info/:publicId(*)', async (req, res) => {
  try {
    const publicId = req.params.publicId;
    
    if (!publicId) {
      return res.status(400).json({ error: 'Public ID is required' });
    }
    
    const { getFileInfoFromCloudinary } = require('./cloudinary-download');
    const info = await getFileInfoFromCloudinary(publicId);
    
    res.json({
      success: true,
      info: info
    });
    
  } catch (error) {
    console.error('❌ Error getting file info:', error);
    res.status(500).json({
      error: 'Failed to get file information',
      message: error.message
    });
  }
});

// ============================================
// Webhook Endpoints
// ============================================

app.post('/webhook/flow1-result', (req, res) => {
  const { processingId, results, docx_url } = req.body;
  console.log(`Received Flow 1 results for ${processingId}`);
  console.log(`DOCX URL: ${docx_url || 'not provided'}`);
  
  if (processingStatus.has(processingId)) {
    processingStatus.get(processingId).results.analysis = results;
    processingStatus.get(processingId).steps.analysis = 'completed';
    // Lưu docx_url nếu có
    if (docx_url) {
      processingStatus.get(processingId).docx_url = docx_url;
      console.log(`✅ Saved DOCX URL for ${processingId}: ${docx_url}`);
    }
    processingStatus.get(processingId).updatedAt = new Date().toISOString();
  }
  
  res.json({ success: true });
});

app.post('/webhook/flow2-result', (req, res) => {
  const { processingId, results } = req.body;
  console.log(`Received Flow 2 results for ${processingId}`);
  
  if (processingStatus.has(processingId)) {
    processingStatus.get(processingId).results.sharing = results;
    processingStatus.get(processingId).steps.sharing = 'completed';
    processingStatus.get(processingId).updatedAt = new Date().toISOString();
  }
  
  res.json({ success: true });
});

app.post('/webhook/flow3-result', (req, res) => {
  const { processingId, results } = req.body;
  console.log(`Received Flow 3 results for ${processingId}`);
  
  if (processingStatus.has(processingId)) {
    processingStatus.get(processingId).results.gdpr = results;
    processingStatus.get(processingId).steps.gdpr = 'completed';
    processingStatus.get(processingId).updatedAt = new Date().toISOString();
  }
  
  res.json({ success: true });
});

// POST /api/document/trigger-gdpr - Trigger GDPR workflow for a processing ID
app.post('/api/document/trigger-gdpr', async (req, res) => {
  try {
    const { processingId } = req.body;
    
    if (!processingId) {
      return res.status(400).json({
        success: false,
        error: 'processingId is required'
      });
    }
    
    console.log(`🔍 Triggering GDPR workflow for ${processingId}`);
    
    // Lấy dữ liệu từ PostgreSQL
    let documentData;
    try {
      const query = `
        SELECT 
          processing_id,
          file_name,
          file_url,
          cloudinary_url,
          user_id,
          department,
          status,
          analysis_results,
          docx_url,
          created_at,
          updated_at,
          analysis_completed_at
        FROM documents
        WHERE processing_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const result = await pgPool.query(query, [processingId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Document not found in PostgreSQL'
        });
      }
      
      documentData = result.rows[0];
    } catch (pgError) {
      console.error('❌ PostgreSQL error:', pgError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch document from PostgreSQL',
        message: pgError.message
      });
    }
    
    // Format dữ liệu để gửi đến Flow 3 (GDPR Compliance)
    const gdprData = {
      success: true,
      processingId: documentData.processing_id,
      message: "Document analysis completed, triggering GDPR check",
      data: {
        processing_id: documentData.processing_id,
        file_name: documentData.file_name,
        file_url: documentData.file_url,
        user_id: documentData.user_id,
        department: documentData.department,
        status: documentData.status,
        analysis_results: documentData.analysis_results,
        cloudinary_url: documentData.cloudinary_url || documentData.file_url,
        docx_url: documentData.docx_url || '',
        created_at: documentData.created_at,
        updated_at: documentData.updated_at,
        analysis_completed_at: documentData.analysis_completed_at
      },
      file: {
        name: documentData.file_name,
        url: documentData.cloudinary_url || documentData.file_url,
        cloudinary_url: documentData.cloudinary_url || documentData.file_url,
        processingId: documentData.processing_id
      }
    };
    
    // Gửi đến Flow 3 (GDPR Compliance webhook)
    try {
      console.log(`📤 Sending data to GDPR workflow: ${FLOW3_URL}`);
      const gdprResponse = await axios.post(FLOW3_URL, gdprData, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ GDPR workflow triggered for ${processingId}`);
      console.log(`   Response status: ${gdprResponse.status}`);
      
      // Cập nhật status
      if (processingStatus.has(processingId)) {
        processingStatus.get(processingId).steps.gdpr = 'processing';
        processingStatus.get(processingId).updatedAt = new Date().toISOString();
      }
      
      res.json({
        success: true,
        message: 'GDPR workflow triggered successfully',
        processingId: processingId
      });
      
    } catch (gdprError) {
      console.error(`❌ Failed to trigger GDPR workflow for ${processingId}:`, gdprError.message);
      
      if (processingStatus.has(processingId)) {
        processingStatus.get(processingId).steps.gdpr = 'failed';
        processingStatus.get(processingId).error = `GDPR workflow trigger failed: ${gdprError.message}`;
      }
      
      return res.status(500).json({
        success: false,
        error: 'Failed to trigger GDPR workflow',
        message: gdprError.message
      });
    }
    
  } catch (error) {
    console.error('❌ Error in trigger-gdpr endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST /api/document/trigger-sharing - Trigger Document Sharing workflow (Flow 3) for a processing ID
app.post('/api/document/trigger-sharing', async (req, res) => {
  try {
    const { 
      processingId, 
      recipient_emails, 
      recipient_names,
      recipients,
      department,
      sharing_method = 'email',
      access_level = 'viewer'
    } = req.body;
    
    if (!processingId) {
      return res.status(400).json({
        success: false,
        error: 'processingId is required'
      });
    }
    
    if (!recipient_emails || (Array.isArray(recipient_emails) && recipient_emails.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'recipient_emails is required and must not be empty'
      });
    }
    
    console.log(`🔍 Triggering Document Sharing workflow for ${processingId}`);
    console.log(`   Recipients: ${Array.isArray(recipient_emails) ? recipient_emails.join(', ') : recipient_emails}`);
    
    // Lấy dữ liệu từ PostgreSQL - JOIN với gdpr_compliance_results để lấy GDPR data
    let documentData;
    let gdprData = null;
    
    try {
      // Query document từ bảng documents
      const docQuery = `
        SELECT 
          processing_id,
          file_name,
          file_url,
          cloudinary_url,
          user_id,
          department,
          status,
          analysis_results,
          docx_url,
          created_at,
          updated_at,
          analysis_completed_at
        FROM documents
        WHERE processing_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const docResult = await pgPool.query(docQuery, [processingId]);
      
      if (docResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Document not found in PostgreSQL'
        });
      }
      
      documentData = docResult.rows[0];
      
      // Query GDPR data từ bảng gdpr_compliance_results
      const gdprQuery = `
        SELECT 
          gdpr_decision,
          gdpr_justification,
          legal_basis,
          retention_days,
          redaction_fields,
          personal_data_found,
          sensitive_data_detected,
          data_volume,
          notify_dpo,
          gdpr_action_performed,
          ai_decision_timestamp,
          gdpr_completed_at
        FROM gdpr_compliance_results
        WHERE processing_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const gdprResult = await pgPool.query(gdprQuery, [processingId]);
      if (gdprResult.rows.length > 0) {
        gdprData = gdprResult.rows[0];
      }
      
    } catch (pgError) {
      console.error('❌ PostgreSQL error:', pgError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch document from PostgreSQL',
        message: pgError.message
      });
    }
    
    // Format recipient_emails và recipient_names
    let finalRecipientEmails = [];
    let finalRecipientNames = [];
    
    if (recipients && Array.isArray(recipients)) {
      // Nếu có recipients array với name và email
      finalRecipientEmails = recipients.map(r => r.email).filter(Boolean);
      finalRecipientNames = recipients.map(r => r.name || '').filter(Boolean);
    } else {
      // Fallback: dùng recipient_emails và recipient_names
      finalRecipientEmails = Array.isArray(recipient_emails) ? recipient_emails : [recipient_emails].filter(Boolean);
      finalRecipientNames = Array.isArray(recipient_names) ? recipient_names : (recipient_names ? [recipient_names] : []);
      
      // Nếu không có names, tạo array rỗng với cùng length
      if (finalRecipientNames.length === 0) {
        finalRecipientNames = new Array(finalRecipientEmails.length).fill('');
      }
    }
    
    // Format dữ liệu để gửi đến Flow 3 (Document Sharing)
    const sharingData = {
      processing_id: documentData.processing_id,
      processingId: documentData.processing_id,
      file_name: documentData.file_name,
      fileName: documentData.file_name,
      file_url: documentData.file_url || documentData.cloudinary_url,
      fileUrl: documentData.file_url || documentData.cloudinary_url,
      cloudinary_url: documentData.cloudinary_url || documentData.file_url,
      cloudinaryUrl: documentData.cloudinary_url || documentData.file_url,
      docx_url: documentData.docx_url || null,
      user_id: documentData.user_id || null,
      userId: documentData.user_id || null,
      department: department || documentData.department || null,
      
      // Recipients
      recipient_emails: finalRecipientEmails,
      recipientEmails: finalRecipientEmails,
      recipient_names: finalRecipientNames,
      recipientNames: finalRecipientNames,
      recipients: recipients || finalRecipientEmails.map((email, index) => ({
        name: finalRecipientNames[index] || '',
        email: email
      })),
      
      // Sharing settings
      sharing_method: sharing_method,
      access_level: access_level,
      
      // GDPR data từ database
      gdpr_decision: gdprData?.gdpr_decision || null,
      gdprDecision: gdprData?.gdpr_decision || null,
      gdpr_justification: gdprData?.gdpr_justification || null,
      gdprJustification: gdprData?.gdpr_justification || null,
      legal_basis: gdprData?.legal_basis || null,
      legalBasis: gdprData?.legal_basis || null,
      retention_days: gdprData?.retention_days || 30,
      retentionDays: gdprData?.retention_days || 30,
      redaction_fields: gdprData?.redaction_fields || [],
      personal_data_found: gdprData?.personal_data_found || [],
      sensitive_data_detected: gdprData?.sensitive_data_detected || false,
      data_volume: gdprData?.data_volume || null,
      notify_dpo: gdprData?.notify_dpo || false,
      
      // Analysis results
      analysis_results: documentData.analysis_results || null,
      analysisResults: documentData.analysis_results || null,
      
      // Metadata
      gdpr_approved: true, // Frontend đã approve
      status: 'pending',
      sharing_status: 'queued',
      workflow_source: 'flow3-document-sharing'
    };
    
    // Gửi đến Flow 3 (Document Sharing webhook)
    // Sử dụng URL đầy đủ: https://n8n.aidocmanageagent.io.vn/webhook/document-sharing
    const SHARING_WEBHOOK_URL = process.env.N8N_SHARING_WEBHOOK_URL || 
                                 'https://n8n.aidocmanageagent.io.vn/webhook/document-sharing';
    
    try {
      console.log(`📤 Sending data to Document Sharing workflow: ${SHARING_WEBHOOK_URL}`);
      console.log(`   File: ${sharingData.file_name}`);
      console.log(`   Recipients: ${finalRecipientEmails.length} emails`);
      
      const sharingResponse = await axios.post(SHARING_WEBHOOK_URL, sharingData, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ Document Sharing workflow triggered for ${processingId}`);
      console.log(`   Response status: ${sharingResponse.status}`);
      
      // Cập nhật status
      if (processingStatus.has(processingId)) {
        processingStatus.get(processingId).steps.sharing = 'processing';
        processingStatus.get(processingId).updatedAt = new Date().toISOString();
      }
      
      res.json({
        success: true,
        message: 'Document Sharing workflow triggered successfully',
        processingId: processingId,
        recipients: finalRecipientEmails.length,
        needApproval: false // Có thể thêm logic kiểm tra nếu cần
      });
      
    } catch (sharingError) {
      console.error(`❌ Failed to trigger Document Sharing workflow for ${processingId}:`, sharingError.message);
      console.error(`   Error details:`, sharingError.response?.data || sharingError.message);
      
      if (processingStatus.has(processingId)) {
        processingStatus.get(processingId).steps.sharing = 'failed';
        processingStatus.get(processingId).error = `Sharing workflow trigger failed: ${sharingError.message}`;
      }
      
      return res.status(500).json({
        success: false,
        error: 'Failed to trigger Document Sharing workflow',
        message: sharingError.message,
        details: sharingError.response?.data || null
      });
    }
    
  } catch (error) {
    console.error('❌ Error in trigger-sharing endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================
// PostgreSQL Data Retrieval API Endpoints
// ============================================

/**
 * GET /api/document/get-from-postgres/:processingId
 * Lấy dữ liệu từ PostgreSQL theo processing_id
 */
app.get('/api/document/get-from-postgres/:processingId', async (req, res) => {
  try {
    const { processingId } = req.params;
    
    if (!processingId) {
      return res.status(400).json({
        success: false,
        error: 'processingId is required'
      });
    }
    
    console.log(`📊 Fetching document from PostgreSQL: ${processingId}`);
    
    const query = `
      SELECT 
        id,
        processing_id,
        file_name,
        file_url,
        cloudinary_url,
        user_id,
        department,
        status,
        analysis_results,
        docx_url,
        created_at,
        updated_at,
        analysis_completed_at
      FROM documents
      WHERE processing_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await pgPool.query(query, [processingId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        processingId: processingId
      });
    }
    
    const document = result.rows[0];
    
    console.log(`✅ Document found: ${document.file_name}`);
    
    res.json({
      success: true,
      data: document
    });
    
  } catch (error) {
    console.error('❌ Error fetching document from PostgreSQL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch document from PostgreSQL',
      message: error.message
    });
  }
});

/**
 * GET /api/document/get-all-completed
 * Lấy tất cả documents đã hoàn thành từ PostgreSQL
 * Query params: limit, offset, userId, department
 */
app.get('/api/document/get-all-completed', async (req, res) => {
  try {
    const { 
      limit = 50, 
      offset = 0, 
      userId, 
      department,
      status = 'completed'
    } = req.query;
    
    console.log(`📊 Fetching completed documents from PostgreSQL:`, {
      limit,
      offset,
      userId,
      department,
      status
    });
    
    let query = `
      SELECT 
        id,
        processing_id,
        file_name,
        file_url,
        cloudinary_url,
        user_id,
        department,
        status,
        analysis_results,
        docx_url,
        created_at,
        updated_at,
        analysis_completed_at
      FROM documents
      WHERE status = $1
    `;
    
    const queryParams = [status];
    let paramIndex = 2;
    
    // Add filters
    if (userId) {
      query += ` AND user_id = $${paramIndex}`;
      queryParams.push(userId);
      paramIndex++;
    }
    
    if (department) {
      query += ` AND department = $${paramIndex}`;
      queryParams.push(department);
      paramIndex++;
    }
    
    // Add ordering and pagination
    query += ` ORDER BY analysis_completed_at DESC NULLS LAST, created_at DESC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), parseInt(offset));
    
    // Get total count
    let countQuery = `SELECT COUNT(*) FROM documents WHERE status = $1`;
    const countParams = [status];
    
    if (userId) {
      countQuery += ` AND user_id = $2`;
      countParams.push(userId);
    }
    
    if (department) {
      countQuery += ` AND department = $${countParams.length + 1}`;
      countParams.push(department);
    }
    
    const [result, countResult] = await Promise.all([
      pgPool.query(query, queryParams),
      pgPool.query(countQuery, countParams)
    ]);
    
    const total = parseInt(countResult.rows[0].count);
    
    console.log(`✅ Found ${result.rows.length} documents (total: ${total})`);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching documents from PostgreSQL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documents from PostgreSQL',
      message: error.message
    });
  }
});

/**
 * POST /api/document/send-completed-data
 * Lấy dữ liệu từ PostgreSQL và gửi đến API endpoint khác
 * Body: { processingId, targetUrl, targetMethod, headers }
 */
app.post('/api/document/send-completed-data', async (req, res) => {
  try {
    const { 
      processingId, 
      targetUrl, 
      targetMethod = 'POST',
      headers = {},
      includeAllFields = true
    } = req.body;
    
    if (!processingId) {
      return res.status(400).json({
        success: false,
        error: 'processingId is required'
      });
    }
    
    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        error: 'targetUrl is required'
      });
    }
    
    console.log(`📤 Fetching and sending document data:`, {
      processingId,
      targetUrl,
      targetMethod
    });
    
    // Fetch from PostgreSQL
    const query = `
      SELECT 
        id,
        processing_id,
        file_name,
        file_url,
        cloudinary_url,
        user_id,
        department,
        status,
        analysis_results,
        docx_url,
        created_at,
        updated_at,
        analysis_completed_at
      FROM documents
      WHERE processing_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await pgPool.query(query, [processingId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        processingId: processingId
      });
    }
    
    const document = result.rows[0];
    
    // Prepare data to send
    let dataToSend = document;
    
    if (!includeAllFields) {
      // Only send essential fields
      dataToSend = {
        processing_id: document.processing_id,
        file_name: document.file_name,
        file_url: document.file_url,
        cloudinary_url: document.cloudinary_url,
        user_id: document.user_id,
        department: document.department,
        status: document.status,
        analysis_results: document.analysis_results,
        docx_url: document.docx_url
      };
    }
    
    // Send to target URL
    const axiosConfig = {
      method: targetMethod.toLowerCase(),
      url: targetUrl,
      data: dataToSend,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 30000
    };
    
    console.log(`📤 Sending data to ${targetUrl}...`);
    const response = await axios(axiosConfig);
    
    console.log(`✅ Data sent successfully:`, {
      status: response.status,
      targetUrl
    });
    
    res.json({
      success: true,
      message: 'Data fetched and sent successfully',
      document: document,
      targetResponse: {
        status: response.status,
        data: response.data
      }
    });
    
  } catch (error) {
    console.error('❌ Error sending document data:', error);
    
    if (error.response) {
      // Target API returned an error
      return res.status(error.response.status).json({
        success: false,
        error: 'Failed to send data to target API',
        message: error.message,
        targetResponse: {
          status: error.response.status,
          data: error.response.data
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch or send document data',
      message: error.message
    });
  }
});

/**
 * GET /gdpr
 * Lấy tất cả các file từ bảng documents (Flow 1) kèm kết quả phân tích và GDPR
 * JOIN với bảng gdpr_compliance_results để lấy kết quả GDPR nếu có
 * Query params: limit, offset, userId, department, gdpr_decision, status, search
 */
app.get('/gdpr', async (req, res) => {
  try {
    const { 
      limit = 50, 
      offset = 0, 
      userId, 
      department,
      gdpr_decision,
      status,
      search, // Tìm kiếm theo file_name
      has_analysis = true // Chỉ lấy file đã có kết quả phân tích
    } = req.query;
    
    console.log(`📊 Fetching documents with analysis and GDPR results from PostgreSQL:`, {
      limit,
      offset,
      userId,
      department,
      gdpr_decision,
      status,
      search,
      has_analysis
    });
    
    // Build WHERE clause dynamically
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;
    
    // Base condition: chỉ lấy file đã có kết quả phân tích
    if (has_analysis === 'true' || has_analysis === true) {
      whereConditions.push(`d.analysis_results IS NOT NULL`);
      whereConditions.push(`d.status = 'completed'`);
    }
    
    if (userId) {
      whereConditions.push(`d.user_id = $${paramIndex}`);
      queryParams.push(userId);
      paramIndex++;
    }
    
    if (department) {
      whereConditions.push(`d.department = $${paramIndex}`);
      queryParams.push(department);
      paramIndex++;
    }
    
    if (gdpr_decision) {
      whereConditions.push(`g.gdpr_decision = $${paramIndex}`);
      queryParams.push(gdpr_decision);
      paramIndex++;
    }
    
    if (status) {
      whereConditions.push(`d.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }
    
    if (search) {
      whereConditions.push(`d.file_name ILIKE $${paramIndex}`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';
    
    // Main query: JOIN documents với gdpr_compliance_results
    const query = `
      SELECT 
        -- Thông tin từ bảng documents (Flow 1)
        d.id as document_id,
        d.processing_id,
        d.file_name,
        d.file_url,
        d.cloudinary_url,
        d.user_id,
        d.department,
        d.status as document_status,
        d.analysis_results,
        d.docx_url,
        d.created_at as document_created_at,
        d.updated_at as document_updated_at,
        d.analysis_completed_at,
        
        -- Thông tin từ bảng gdpr_compliance_results (Flow 2) - nếu có
        g.id as gdpr_id,
        g.audit_id,
        g.uploader,
        g.gdpr_decision,
        g.gdpr_justification,
        g.legal_basis,
        g.retention_days,
        g.redaction_fields,
        g.personal_data_found,
        g.sensitive_data_detected,
        g.data_volume,
        g.notify_dpo,
        g.status as gdpr_status,
        g.gdpr_action_performed,
        g.ai_decision_timestamp,
        g.gdpr_completed_at,
        g.workflow_source,
        g.flow2_completed,
        
        -- Flag để biết có kết quả GDPR hay chưa
        CASE WHEN g.processing_id IS NOT NULL THEN true ELSE false END as has_gdpr_result
      FROM documents d
      LEFT JOIN gdpr_compliance_results g ON d.processing_id = g.processing_id
      ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(parseInt(limit), parseInt(offset));
    
    // Count query for pagination
    const countQuery = `
      SELECT COUNT(*) as count
      FROM documents d
      LEFT JOIN gdpr_compliance_results g ON d.processing_id = g.processing_id
      ${whereClause}
    `;
    
    const countParams = queryParams.slice(0, -2); // Remove limit and offset
    
    // Execute both queries in parallel
    const [result, countResult] = await Promise.all([
      pgPool.query(query, queryParams),
      pgPool.query(countQuery, countParams)
    ]);
    
    const total = parseInt(countResult.rows[0].count);
    
    // Format kết quả để dễ sử dụng ở frontend
    const formattedResults = result.rows.map(row => ({
      // Thông tin file cơ bản
      id: row.document_id,
      processing_id: row.processing_id,
      file_name: row.file_name,
      file_url: row.file_url,
      cloudinary_url: row.cloudinary_url,
      user_id: row.user_id,
      department: row.department,
      status: row.document_status,
      docx_url: row.docx_url,
      created_at: row.document_created_at,
      updated_at: row.document_updated_at,
      analysis_completed_at: row.analysis_completed_at,
      
      // Kết quả phân tích từ Flow 1
      analysis_results: row.analysis_results,
      
      // Kết quả GDPR từ Flow 2 (nếu có)
      gdpr_result: row.has_gdpr_result ? {
        id: row.gdpr_id,
        audit_id: row.audit_id,
        uploader: row.uploader,
        gdpr_decision: row.gdpr_decision,
        gdpr_justification: row.gdpr_justification,
        legal_basis: row.legal_basis,
        retention_days: row.retention_days,
        redaction_fields: row.redaction_fields,
        personal_data_found: row.personal_data_found,
        sensitive_data_detected: row.sensitive_data_detected,
        data_volume: row.data_volume,
        notify_dpo: row.notify_dpo,
        status: row.gdpr_status,
        gdpr_action_performed: row.gdpr_action_performed,
        ai_decision_timestamp: row.ai_decision_timestamp,
        gdpr_completed_at: row.gdpr_completed_at,
        workflow_source: row.workflow_source,
        flow2_completed: row.flow2_completed
      } : null,
      
      // Flag tiện lợi
      has_gdpr_result: row.has_gdpr_result,
      has_analysis: !!row.analysis_results
    }));
    
    console.log(`✅ Found ${formattedResults.length} documents with analysis (total: ${total})`);
    
    res.json({
      success: true,
      data: formattedResults,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching documents with GDPR results from PostgreSQL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documents with GDPR results from PostgreSQL',
      message: error.message
    });
  }
});

/**
 * GET /gdpr/:processingId
 * Lấy kết quả GDPR cụ thể theo processing_id (JOIN với documents)
 */
app.get('/gdpr/:processingId', async (req, res) => {
  try {
    const { processingId } = req.params;
    
    if (!processingId) {
      return res.status(400).json({
        success: false,
        error: 'processingId is required'
      });
    }
    
    console.log(`📊 Fetching document with GDPR result from PostgreSQL: ${processingId}`);
    
    const query = `
      SELECT 
        -- Thông tin từ bảng documents (Flow 1)
        d.id as document_id,
        d.processing_id,
        d.file_name,
        d.file_url,
        d.cloudinary_url,
        d.user_id,
        d.department,
        d.status as document_status,
        d.analysis_results,
        d.docx_url,
        d.created_at as document_created_at,
        d.updated_at as document_updated_at,
        d.analysis_completed_at,
        
        -- Thông tin từ bảng gdpr_compliance_results (Flow 2) - nếu có
        g.id as gdpr_id,
        g.audit_id,
        g.uploader,
        g.gdpr_decision,
        g.gdpr_justification,
        g.legal_basis,
        g.retention_days,
        g.redaction_fields,
        g.personal_data_found,
        g.sensitive_data_detected,
        g.data_volume,
        g.notify_dpo,
        g.status as gdpr_status,
        g.gdpr_action_performed,
        g.ai_decision_timestamp,
        g.gdpr_completed_at,
        g.workflow_source,
        g.flow2_completed
      FROM documents d
      LEFT JOIN gdpr_compliance_results g ON d.processing_id = g.processing_id
      WHERE d.processing_id = $1
      ORDER BY d.created_at DESC
      LIMIT 1
    `;
    
    const result = await pgPool.query(query, [processingId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        processingId: processingId
      });
    }
    
    const row = result.rows[0];
    
    // Format kết quả
    const formattedResult = {
      // Thông tin file cơ bản
      id: row.document_id,
      processing_id: row.processing_id,
      file_name: row.file_name,
      file_url: row.file_url,
      cloudinary_url: row.cloudinary_url,
      user_id: row.user_id,
      department: row.department,
      status: row.document_status,
      docx_url: row.docx_url,
      created_at: row.document_created_at,
      updated_at: row.document_updated_at,
      analysis_completed_at: row.analysis_completed_at,
      
      // Kết quả phân tích từ Flow 1
      analysis_results: row.analysis_results,
      
      // Kết quả GDPR từ Flow 2 (nếu có)
      gdpr_result: row.gdpr_id ? {
        id: row.gdpr_id,
        audit_id: row.audit_id,
        uploader: row.uploader,
        gdpr_decision: row.gdpr_decision,
        gdpr_justification: row.gdpr_justification,
        legal_basis: row.legal_basis,
        retention_days: row.retention_days,
        redaction_fields: row.redaction_fields,
        personal_data_found: row.personal_data_found,
        sensitive_data_detected: row.sensitive_data_detected,
        data_volume: row.data_volume,
        notify_dpo: row.notify_dpo,
        status: row.gdpr_status,
        gdpr_action_performed: row.gdpr_action_performed,
        ai_decision_timestamp: row.ai_decision_timestamp,
        gdpr_completed_at: row.gdpr_completed_at,
        workflow_source: row.workflow_source,
        flow2_completed: row.flow2_completed
      } : null,
      
      has_gdpr_result: !!row.gdpr_id,
      has_analysis: !!row.analysis_results
    };
    
    console.log(`✅ Document found: ${formattedResult.file_name}`);
    
    res.json({
      success: true,
      data: formattedResult
    });
    
  } catch (error) {
    console.error('❌ Error fetching document with GDPR result from PostgreSQL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch document with GDPR result from PostgreSQL',
      message: error.message
    });
  }
});

// ============================================
// Approval Management API Endpoints
// ============================================

/**
 * GET /api/approvals/list
 * Lấy danh sách approvals từ bảng document_sharing
 * Query params: status (ALL, PENDING, APPROVED, REJECTED)
 */
app.get('/api/approvals/list', async (req, res) => {
  try {
    const { status = 'ALL' } = req.query;
    
    console.log(`📊 Fetching approvals list with status: ${status}`);
    
    let query = `
      SELECT 
        sharing_id as uniqueKey,
        processing_id,
        file_name as documentTitle,
        department as documentCategory,
        user_id as uploader,
        recipient_emails as shareWithEmails,
        recipient_names,
        status,
        gdpr_decision,
        legal_basis,
        retention_days,
        created_at as createdAt,
        sharing_requested_at,
        notes,
        file_url as webViewLink,
        cloudinary_url
      FROM document_sharing
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    
    // Filter theo status
    if (status !== 'ALL') {
      if (status === 'PENDING') {
        query += ` AND status = $${paramIndex}`;
        queryParams.push('pending');
        paramIndex++;
      } else if (status === 'APPROVED') {
        query += ` AND status = $${paramIndex}`;
        queryParams.push('sent');
        paramIndex++;
      } else if (status === 'REJECTED') {
        query += ` AND status = $${paramIndex}`;
        queryParams.push('cancelled');
        paramIndex++;
      }
    }
    
    query += ` ORDER BY created_at DESC LIMIT 100`;
    
    const result = await pgPool.query(query, queryParams);
    
    // Format approvals
    const approvals = result.rows.map(row => ({
      uniqueKey: row.uniquekey || row.sharing_id,
      documentTitle: row.documenttitle || row.file_name,
      documentCategory: row.documentcategory || row.department,
      uploader: row.uploader || row.user_id,
      shareWithEmails: row.sharewithemails || row.recipient_emails || [],
      recipientNames: row.recipient_names || [],
      status: row.status === 'pending' ? 'PENDING' : 
              row.status === 'sent' ? 'APPROVED' : 
              row.status === 'cancelled' ? 'REJECTED' : 'PENDING',
      gdprDecision: row.gdpr_decision,
      legalBasis: row.legal_basis,
      retentionDays: row.retention_days,
      createdAt: row.createdat || row.created_at,
      webViewLink: row.webviewlink || row.file_url || row.cloudinary_url,
      notes: row.notes,
      processingId: row.processing_id
    }));
    
    console.log(`✅ Found ${approvals.length} approvals`);
    
    res.json({
      success: true,
      approvals: approvals
    });
    
  } catch (error) {
    console.error('❌ Error fetching approvals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch approvals',
      message: error.message,
      approvals: [] // Trả về empty array để frontend không bị lỗi
    });
  }
});

/**
 * POST /api/approvals/process
 * Xử lý approve/reject cho approval request
 * Body: { uniqueKey, approved: boolean, approvedBy?: string, rejectedBy?: string, reason?: string }
 */
app.post('/api/approvals/process', async (req, res) => {
  try {
    const { uniqueKey, approved, approvedBy, rejectedBy, reason } = req.body;
    
    if (!uniqueKey) {
      return res.status(400).json({
        success: false,
        error: 'uniqueKey is required'
      });
    }
    
    if (approved === undefined) {
      return res.status(400).json({
        success: false,
        error: 'approved (boolean) is required'
      });
    }
    
    console.log(`📝 Processing approval: ${uniqueKey}, approved: ${approved}`);
    
    // Update status trong bảng document_sharing
    let updateQuery;
    let queryParams;
    
    if (approved) {
      updateQuery = `
        UPDATE document_sharing
        SET 
          status = 'sent',
          sharing_status = 'processing',
          updated_at = CURRENT_TIMESTAMP,
          notes = COALESCE(notes || E'\\n', '') || $1
        WHERE sharing_id = $2
        RETURNING *
      `;
      queryParams = [
        `Approved by ${approvedBy || 'admin'} at ${new Date().toISOString()}`,
        uniqueKey
      ];
    } else {
      updateQuery = `
        UPDATE document_sharing
        SET 
          status = 'cancelled',
          sharing_status = 'failed',
          updated_at = CURRENT_TIMESTAMP,
          notes = COALESCE(notes || E'\\n', '') || $1
        WHERE sharing_id = $2
        RETURNING *
      `;
      queryParams = [
        `Rejected by ${rejectedBy || 'admin'} at ${new Date().toISOString()}. Reason: ${reason || 'No reason provided'}`,
        uniqueKey
      ];
    }
    
    const result = await pgPool.query(updateQuery, queryParams);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Approval not found',
        uniqueKey: uniqueKey
      });
    }
    
    console.log(`✅ Approval ${approved ? 'approved' : 'rejected'} successfully`);
    
    res.json({
      success: true,
      message: `Approval ${approved ? 'approved' : 'rejected'} successfully`,
      uniqueKey: uniqueKey,
      approved: approved,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Error processing approval:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process approval',
      message: error.message
    });
  }
});

/**
 * POST /gdpr/:processingId/action
 * Xử lý action cho file: 'send' (gửi đi), 'delete' (xóa), 'skip' (không gửi)
 * Body: { action: 'send' | 'delete' | 'skip', recipient_emails?: string[], notes?: string }
 */
app.post('/gdpr/:processingId/action', async (req, res) => {
  try {
    const { processingId } = req.params;
    const { action, recipient_emails, notes } = req.body;
    
    if (!processingId) {
      return res.status(400).json({
        success: false,
        error: 'processingId is required'
      });
    }
    
    if (!action || !['send', 'delete', 'skip'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'action is required and must be one of: send, delete, skip'
      });
    }
    
    console.log(`📊 Processing action '${action}' for document: ${processingId}`);
    
    // Lấy thông tin document và GDPR result
    const getQuery = `
      SELECT 
        d.*,
        g.gdpr_decision,
        g.gdpr_justification,
        g.legal_basis,
        g.retention_days
      FROM documents d
      LEFT JOIN gdpr_compliance_results g ON d.processing_id = g.processing_id
      WHERE d.processing_id = $1
      LIMIT 1
    `;
    
    const docResult = await pgPool.query(getQuery, [processingId]);
    
    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        processingId: processingId
      });
    }
    
    const document = docResult.rows[0];
    
    // Xử lý theo action
    if (action === 'send') {
      // Gửi đến Flow 3 (Document Sharing)
      if (!recipient_emails || !Array.isArray(recipient_emails) || recipient_emails.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'recipient_emails is required for send action'
        });
      }
      
      // Chuẩn bị dữ liệu để gửi đến Flow 3
      const sharingData = {
        processing_id: document.processing_id,
        file_name: document.file_name,
        file_url: document.file_url,
        cloudinary_url: document.cloudinary_url,
        user_id: document.user_id,
        department: document.department,
        recipient_emails: recipient_emails,
        sharing_method: 'email',
        access_level: 'viewer',
        gdpr_decision: document.gdpr_decision || 'allow',
        gdpr_approved: true,
        legal_basis: document.legal_basis,
        retention_days: document.retention_days || 30,
        notes: notes || null
      };
      
      try {
        console.log(`📤 Sending document to Flow 3 (Document Sharing): ${FLOW2_URL}`);
        const sharingResponse = await axios.post(FLOW2_URL, sharingData, {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`✅ Document sent to Flow 3 successfully`);
        
        res.json({
          success: true,
          message: 'Document sent to Flow 3 for sharing',
          action: 'send',
          processingId: processingId,
          sharingResponse: sharingResponse.data
        });
      } catch (sharingError) {
        console.error(`❌ Failed to send document to Flow 3:`, sharingError.message);
        res.status(500).json({
          success: false,
          error: 'Failed to send document to Flow 3',
          message: sharingError.message
        });
      }
      
    } else if (action === 'delete') {
      // Xóa file (có thể chỉ đánh dấu hoặc xóa thực sự)
      // Ở đây chúng ta sẽ đánh dấu status = 'deleted' thay vì xóa thực sự
      const updateQuery = `
        UPDATE documents
        SET status = 'deleted',
            updated_at = CURRENT_TIMESTAMP
        WHERE processing_id = $1
        RETURNING *
      `;
      
      const updateResult = await pgPool.query(updateQuery, [processingId]);
      
      console.log(`✅ Document marked as deleted: ${processingId}`);
      
      res.json({
        success: true,
        message: 'Document marked as deleted',
        action: 'delete',
        processingId: processingId,
        document: updateResult.rows[0]
      });
      
    } else if (action === 'skip') {
      // Không gửi - chỉ ghi log hoặc cập nhật notes
      const updateQuery = `
        UPDATE documents
        SET updated_at = CURRENT_TIMESTAMP
        WHERE processing_id = $1
        RETURNING *
      `;
      
      await pgPool.query(updateQuery, [processingId]);
      
      // Có thể lưu notes vào bảng gdpr_compliance_results nếu có
      if (notes) {
        const updateGdprQuery = `
          UPDATE gdpr_compliance_results
          SET notes = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE processing_id = $2
        `;
        await pgPool.query(updateGdprQuery, [notes, processingId]);
      }
      
      console.log(`✅ Document skipped: ${processingId}`);
      
      res.json({
        success: true,
        message: 'Document skipped (not sent)',
        action: 'skip',
        processingId: processingId
      });
    }
    
  } catch (error) {
    console.error('❌ Error processing action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process action',
      message: error.message
    });
  }
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Serve static files (users.json) - after API routes
app.use(express.static(path.join(__dirname, '..')));
app.use('/api/users', express.static(path.join(__dirname, 'users.json')));

// Error handling middleware (must be after all routes)
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('❌ Multer error:', error);
    return res.status(400).json({ 
      error: 'File upload error',
      message: error.message 
    });
  }
  if (error) {
    console.error('❌ Upload error:', error);
    return res.status(400).json({ 
      error: 'Upload error',
      message: error.message 
    });
  }
  next();
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend API running on port ${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api/document/process`);
  console.log(`📊 Frontend: http://localhost:3000`);
});

module.exports = app;
