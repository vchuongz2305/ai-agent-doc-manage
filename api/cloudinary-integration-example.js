/**
 * Ví dụ tích hợp Cloudinary scripts vào unified-document-agent.js
 * 
 * Cách sử dụng:
 * 1. Copy các function này vào unified-document-agent.js
 * 2. Thêm require ở đầu file
 * 3. Sử dụng trong route handlers
 */

const { uploadFileToCloudinary, uploadFileBufferToCloudinary } = require('./cloudinary-upload');
const { downloadFileFromCloudinary, downloadFileFromCloudinaryUrl } = require('./cloudinary-download');

/**
 * Ví dụ 1: Upload file sau khi nhận từ frontend
 * Thay thế phần gửi file path trong POST /api/document/process
 */
async function handleFileUploadWithCloudinary(req, res) {
  try {
    const file = req.file;
    const { userId, department, sharingEmails } = req.body;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate unique processing ID
    const processingId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`📤 Uploading file to Cloudinary: ${file.originalname}`);
    
    // Upload file lên Cloudinary
    const cloudinaryResult = await uploadFileToCloudinary(
      file.path,              // File path từ multer
      processingId,          // Processing ID
      file.originalname       // Original file name
    );
    
    console.log(`✅ File uploaded to Cloudinary: ${cloudinaryResult.secure_url}`);
    
    // Initialize processing status
    const status = {
      id: processingId,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      userId: userId,
      department: department,
      sharingEmails: sharingEmails ? sharingEmails.split(',') : [],
      status: 'processing',
      cloudinaryUrl: cloudinaryResult.secure_url,
      cloudinaryPublicId: cloudinaryResult.public_id,
      createdAt: new Date().toISOString()
    };
    
    // Gửi đến n8n webhook với Cloudinary URL (thay vì file path)
    const webhookData = {
      file: {
        name: file.originalname,
        url: cloudinaryResult.secure_url,        // Cloudinary URL
        cloudinary_public_id: cloudinaryResult.public_id,
        size: file.size,
        mimeType: file.mimeType
      },
      userId: userId,
      department: department,
      processingId: processingId
    };
    
    // Gửi đến n8n (không cần gửi file binary)
    const n8nResponse = await axios.post(FLOW1_URL, webhookData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    
    // Lưu metadata vào database (nếu cần)
    // await saveToDatabase({
    //   processing_id: processingId,
    //   file_name: file.originalname,
    //   file_url: file.path,  // Local file path (optional)
    //   cloudinary_url: cloudinaryResult.secure_url,
    //   cloudinary_public_id: cloudinaryResult.public_id,
    //   user_id: userId,
    //   department: department,
    //   status: 'processing'
    // });
    
    // Xóa file local sau khi upload thành công (optional)
    // fs.unlinkSync(file.path);
    
    return res.json({
      success: true,
      processingId: processingId,
      cloudinaryUrl: cloudinaryResult.secure_url,
      message: 'File uploaded and processing started'
    });
    
  } catch (error) {
    console.error('❌ Error in handleFileUploadWithCloudinary:', error);
    return res.status(500).json({ 
      error: 'Failed to upload file',
      message: error.message 
    });
  }
}

/**
 * Ví dụ 2: Upload từ buffer (không cần lưu file tạm)
 */
async function handleFileUploadFromBuffer(req, res) {
  try {
    const file = req.file;
    const { userId, department } = req.body;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const processingId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Đọc file vào buffer
    const fileBuffer = fs.readFileSync(file.path);
    
    // Upload buffer lên Cloudinary (không cần lưu file tạm)
    const cloudinaryResult = await uploadFileBufferToCloudinary(
      fileBuffer,
      processingId,
      file.originalname,
      file.mimetype
    );
    
    // Xóa file local ngay sau khi upload
    fs.unlinkSync(file.path);
    
    // Gửi đến n8n với Cloudinary URL
    const webhookData = {
      file: {
        name: file.originalname,
        url: cloudinaryResult.secure_url,
        cloudinary_public_id: cloudinaryResult.public_id
      },
      userId: userId,
      department: department,
      processingId: processingId
    };
    
    await axios.post(FLOW1_URL, webhookData);
    
    return res.json({
      success: true,
      processingId: processingId,
      cloudinaryUrl: cloudinaryResult.secure_url
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Ví dụ 3: Download file từ Cloudinary khi cần
 */
async function downloadFileFromCloudinaryHandler(req, res) {
  try {
    const { processingId } = req.params;
    
    // Lấy public_id từ database
    // const doc = await db.query(
    //   'SELECT cloudinary_public_id FROM documents WHERE processing_id = $1',
    //   [processingId]
    // );
    
    // if (!doc.rows[0] || !doc.rows[0].cloudinary_public_id) {
    //   return res.status(404).json({ error: 'File not found' });
    // }
    
    // Download file từ Cloudinary
    const result = await downloadFileFromCloudinary(
      doc.rows[0].cloudinary_public_id
    );
    
    // Trả về file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${processingId}.pdf"`);
    res.send(result.buffer);
    
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Ví dụ 4: Route handler mới cho upload với Cloudinary
 * Thêm vào unified-document-agent.js:
 * 
 * app.post('/api/document/process-cloudinary', upload.single('file'), handleFileUploadWithCloudinary);
 */
module.exports = {
  handleFileUploadWithCloudinary,
  handleFileUploadFromBuffer,
  downloadFileFromCloudinaryHandler
};

