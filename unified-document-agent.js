const express = require('express');
const multer = require('multer');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 5000;

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

// Serve static files (users.json)
app.use(express.static('.'));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
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

// Result webhook URLs
const RESULT_WEBHOOKS = {
  flow1: 'https://api.aidocmanageagent.io.vn/webhook/flow1-result',
  flow2: 'https://api.aidocmanageagent.io.vn/webhook/flow2-result',
  flow3: 'https://api.aidocmanageagent.io.vn/webhook/flow3-result'
};

// Store processing status
const processingStatus = new Map();

// Unified Document Processing Endpoint
app.post('/api/document/process', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { userId, department, sharingEmails } = req.body;
    
    if (!file) {
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
    console.log(`Starting analysis for ${processingId}`);
    const analysisData = {
      file: {
        name: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        path: file.path
      },
      userId: userId,
      department: department,
      processingId: processingId
    };

    try {
      const analysisResponse = await axios.post(FLOW1_URL, analysisData);
      console.log(`Analysis completed for ${processingId}`);
      
      processingStatus.get(processingId).steps.analysis = 'completed';
      processingStatus.get(processingId).results.analysis = analysisResponse.data;
      processingStatus.get(processingId).updatedAt = new Date().toISOString();
    } catch (error) {
      console.error(`Analysis failed for ${processingId}:`, error.message);
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
    console.error('Error processing document:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
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

// Serve the unified interface
// API Routes only - No frontend serving

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend API running on port ${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api/document/process`);
  console.log(`📊 Frontend: http://localhost:3000`);
});

module.exports = app;
