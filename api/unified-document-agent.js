// Load path module first (needed for .env path resolution)
const path = require('path');

// Load environment variables
try {
  const dotenv = require('dotenv');
  // Try multiple paths to find .env file
  const envPaths = [
    path.join(__dirname, '..', '.env'),  // From api/ directory
    path.join(process.cwd(), '.env'),     // From current working directory
    '.env'                                 // Relative to current directory
  ];
  
  let loaded = false;
  for (const envPath of envPaths) {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      console.log(`✅ Environment variables loaded from: ${envPath}`);
      loaded = true;
      break;
    }
  }
  
  if (!loaded) {
    console.log('ℹ️ .env file not found in any of these locations:', envPaths);
    console.log('   Using default/process.env values');
  }
} catch (e) {
  // dotenv not installed, continue without it
  console.log('ℹ️ dotenv not found, using default/process.env values');
  console.log('   Error:', e.message);
}

const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');

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
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
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
    
    // Prepare file path for webhook (relative path from uploads folder)
    const fileName = path.basename(file.path);
    const fileUrl = `https://api.aidocmanageagent.io.vn/uploads/${fileName}`;
    
    const analysisData = {
      file: {
        name: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        path: file.path,
        url: fileUrl  // Add URL for N8N to download
      },
      userId: userId,
      department: department,
      processingId: processingId
    };

    console.log(`📋 Sending data to webhook:`, {
      processingId: analysisData.processingId,
      fileName: analysisData.file.name,
      fileSize: analysisData.file.size,
      fileUrl: analysisData.file.url,
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
  
  res.json(status);
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
app.post('/webhook/flow1-result', (req, res) => {
  const { processingId, results } = req.body;
  console.log(`Received Flow 1 results for ${processingId}`);
  
  if (processingStatus.has(processingId)) {
    processingStatus.get(processingId).results.analysis = results;
    processingStatus.get(processingId).steps.analysis = 'completed';
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
