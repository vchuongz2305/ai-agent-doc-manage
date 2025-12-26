/**
 * Script upload file lên Cloudinary
 * Sử dụng để upload file PDF trực tiếp từ backend, không cần qua n8n node
 */

const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
// Load .env from project root
require('../load-env');

// Cấu hình Cloudinary từ environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload file lên Cloudinary
 * @param {string} filePath - Đường dẫn file cần upload
 * @param {string} processingId - Processing ID để tạo folder structure
 * @param {string} fileName - Tên file gốc
 * @returns {Promise<Object>} - Kết quả upload từ Cloudinary
 */
async function uploadFileToCloudinary(filePath, processingId, fileName) {
  try {
    // Validate file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Validate Cloudinary config
    if (!cloudinary.config().cloud_name || !cloudinary.config().api_key || !cloudinary.config().api_secret) {
      throw new Error('Cloudinary credentials not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env file');
    }

    // Sanitize fileName để đảm bảo valid public_id
    // Giữ nguyên extension nhưng sanitize ký tự đặc biệt
    const fileExt = path.extname(fileName).toLowerCase();
    const baseName = path.basename(fileName, fileExt);
    
    // Sanitize base name (loại bỏ ký tự đặc biệt nhưng giữ extension)
    let sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
    // Thay nhiều dấu _ liên tiếp bằng một dấu _
    sanitizedBaseName = sanitizedBaseName.replace(/_+/g, '_');
    // Loại bỏ dấu _ ở đầu và cuối
    sanitizedBaseName = sanitizedBaseName.replace(/^_+|_+$/g, '');
    // Giữ lại extension
    const sanitizedFileName = sanitizedBaseName + fileExt;
    
    // Tạo public_id với folder structure: {processingId}/{filename}
    // KHÔNG thêm "documents/" vào public_id vì sẽ dùng folder option
    const publicId = `${processingId}/${sanitizedFileName}`;

    console.log(`📤 Uploading file to Cloudinary...`);
    console.log(`   File: ${filePath}`);
    console.log(`   Public ID: ${publicId}`);

    // Xác định resource_type dựa trên file extension (fileExt đã được khai báo ở trên)
    let resourceType = 'auto';
    if (fileExt === '.pdf' || fileExt === '.doc' || fileExt === '.docx' || 
        fileExt === '.xls' || fileExt === '.xlsx' || fileExt === '.txt') {
      resourceType = 'raw'; // PDF và documents nên dùng raw
    }

    // Upload file lên Cloudinary với options để đảm bảo file public và có thể download
    // QUAN TRỌNG: Nếu tài khoản bị "untrusted", cần vào Cloudinary Dashboard để fix
    const uploadOptions = {
      public_id: publicId,
      resource_type: resourceType, // raw cho PDF
      folder: 'documents', // Folder trong Cloudinary
      overwrite: true, // Overwrite nếu file đã tồn tại
      access_mode: 'public', // QUAN TRỌNG: Đảm bảo file public để có thể download
      invalidate: true, // Invalidate CDN cache
      use_filename: false, // Không dùng filename của Cloudinary
      unique_filename: false, // Không thêm unique suffix
      type: 'upload', // Đảm bảo là upload type
      moderation: 'manual', // Bỏ qua moderation để tránh delay
      notification_url: undefined // Không cần notification
    };

    console.log(`   Upload options:`, JSON.stringify({
      public_id: uploadOptions.public_id,
      resource_type: uploadOptions.resource_type,
      folder: uploadOptions.folder,
      access_mode: uploadOptions.access_mode,
      overwrite: uploadOptions.overwrite
    }, null, 2));

    const result = await cloudinary.uploader.upload(filePath, uploadOptions);

    // Verify upload result
    if (!result || !result.secure_url) {
      throw new Error('Cloudinary upload failed - no secure_url in response');
    }

    console.log(`✅ File uploaded successfully!`);
    console.log(`   Public ID: ${result.public_id}`);
    console.log(`   URL: ${result.secure_url}`);
    console.log(`   Size: ${result.bytes} bytes`);
    console.log(`   Resource Type: ${result.resource_type}`);
    console.log(`   Access Mode: ${result.access_mode || 'public (default)'}`);
    
    // QUAN TRỌNG: Force update access_mode nếu file bị block
    // Nếu file không public hoặc bị block, cố gắng update access control
    if (!result.access_mode || result.access_mode !== 'public') {
      console.warn(`⚠️  Warning: File access_mode is "${result.access_mode || 'unknown'}", attempting to fix...`);
      
      try {
        // Update access control để force public
        const updateResult = await cloudinary.uploader.explicit(result.public_id, {
          resource_type: result.resource_type || resourceType,
          type: 'upload',
          access_mode: 'public',
          overwrite: true,
          invalidate: true
        });
        
        console.log(`✅ Access mode updated successfully!`);
        console.log(`   New access_mode: ${updateResult.access_mode || 'public'}`);
        
        // Cập nhật result với thông tin mới
        if (updateResult.secure_url) {
          result.secure_url = updateResult.secure_url;
        }
        result.access_mode = updateResult.access_mode || 'public';
      } catch (updateError) {
        console.warn(`⚠️  Could not update access_mode: ${updateError.message}`);
        console.warn(`   File may still be accessible via signed URL`);
      }
    }
    
    // Verify file is public
    if (result.access_mode && result.access_mode !== 'public') {
      console.warn(`⚠️  Warning: File access_mode is still "${result.access_mode}", expected "public"`);
      console.warn(`   You may need to configure Cloudinary dashboard settings`);
      console.warn(`   Or use signed URLs for file access`);
    }

    // Verify file is accessible by checking URL format
    if (!result.secure_url || !result.public_id) {
      throw new Error('Cloudinary upload succeeded but missing secure_url or public_id');
    }

    // Log important info for debugging
    console.log(`   ✅ Upload verified:`);
    console.log(`      Public ID: ${result.public_id}`);
    console.log(`      Resource Type: ${result.resource_type}`);
    console.log(`      Format: ${result.format || 'N/A'}`);
    console.log(`      Bytes: ${result.bytes}`);
    console.log(`      Access Mode: ${result.access_mode || 'public (default)'}`);

    return {
      success: true,
      public_id: result.public_id,
      secure_url: result.secure_url,
      url: result.url,
      bytes: result.bytes,
      format: result.format,
      resource_type: result.resource_type || resourceType, // Fallback to original resourceType
      created_at: result.created_at,
      width: result.width,
      height: result.height,
      access_mode: result.access_mode || 'public'
    };

  } catch (error) {
    console.error(`❌ Error uploading file to Cloudinary:`, error.message);
    
    // Log chi tiết lỗi để debug
    if (error.http_code) {
      console.error(`   HTTP Code: ${error.http_code}`);
    }
    if (error.name) {
      console.error(`   Error Name: ${error.name}`);
    }
    if (error.message) {
      console.error(`   Error Message: ${error.message}`);
    }
    if (error.response) {
      console.error(`   Error Response:`, JSON.stringify(error.response, null, 2));
    }
    
    // Xử lý lỗi cụ thể
    if (error.message && (error.message.includes('untrusted') || error.message.includes('Customer is marked as untrusted'))) {
      console.error(`   ⚠️  Cloudinary account may be marked as untrusted`);
      console.error(`   💡 Try: Check Cloudinary dashboard settings for access control`);
      console.error(`   💡 Try: Verify API credentials are correct`);
      console.error(`   💡 Try: Check if account has restrictions on raw file uploads`);
    }
    
    throw error;
  }
}

/**
 * Upload file từ buffer (không cần lưu file tạm)
 * @param {Buffer} fileBuffer - Buffer của file
 * @param {string} processingId - Processing ID
 * @param {string} fileName - Tên file
 * @param {string} mimeType - MIME type của file
 * @returns {Promise<Object>} - Kết quả upload
 */
async function uploadFileBufferToCloudinary(fileBuffer, processingId, fileName, mimeType = 'application/pdf') {
  try {
    // Validate Cloudinary config
    if (!cloudinary.config().cloud_name || !cloudinary.config().api_key || !cloudinary.config().api_secret) {
      throw new Error('Cloudinary credentials not configured');
    }

    // Sanitize fileName - giữ nguyên extension
    const fileExt = path.extname(fileName).toLowerCase();
    const baseName = path.basename(fileName, fileExt);
    
    // Sanitize base name (loại bỏ ký tự đặc biệt nhưng giữ extension)
    let sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
    // Thay nhiều dấu _ liên tiếp bằng một dấu _
    sanitizedBaseName = sanitizedBaseName.replace(/_+/g, '_');
    // Loại bỏ dấu _ ở đầu và cuối
    sanitizedBaseName = sanitizedBaseName.replace(/^_+|_+$/g, '');
    // Giữ lại extension
    const sanitizedFileName = sanitizedBaseName + fileExt;
    
    // Tạo public_id: {processingId}/{filename}
    // KHÔNG thêm "documents/" vào public_id vì sẽ dùng folder option
    const publicId = `${processingId}/${sanitizedFileName}`;

    console.log(`📤 Uploading file buffer to Cloudinary...`);
    console.log(`   Public ID: ${publicId}`);
    console.log(`   Size: ${fileBuffer.length} bytes`);

    // Xác định resource_type dựa trên mimeType hoặc fileName
    let resourceType = 'auto';
    if (mimeType && mimeType.includes('pdf')) {
      resourceType = 'raw';
    } else if (fileName.toLowerCase().endsWith('.pdf')) {
      resourceType = 'raw';
    }

    // Upload từ buffer với options để đảm bảo file public
    const uploadOptions = {
      public_id: publicId,
      resource_type: resourceType, // raw cho PDF
      folder: 'documents',
      overwrite: false,
      access_mode: 'public', // QUAN TRỌNG: Đảm bảo file public để có thể download
      use_filename: false, // Không dùng filename của Cloudinary
      unique_filename: false, // Không thêm unique suffix
      type: 'upload' // Đảm bảo là upload type
    };

    console.log(`   Upload options:`, JSON.stringify({
      public_id: uploadOptions.public_id,
      resource_type: uploadOptions.resource_type,
      folder: uploadOptions.folder,
      access_mode: uploadOptions.access_mode,
      overwrite: uploadOptions.overwrite
    }, null, 2));

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error(`   ❌ Upload stream error:`, error.message);
            if (error.http_code) console.error(`   HTTP Code: ${error.http_code}`);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.end(fileBuffer);
    });

    // Verify upload result
    if (!result || !result.secure_url) {
      throw new Error('Cloudinary upload failed - no secure_url in response');
    }

    console.log(`✅ File buffer uploaded successfully!`);
    console.log(`   Public ID: ${result.public_id}`);
    console.log(`   URL: ${result.secure_url}`);
    console.log(`   Resource Type: ${result.resource_type}`);
    console.log(`   Access Mode: ${result.access_mode || 'public (default)'}`);
    
    // QUAN TRỌNG: Force update access_mode nếu file bị block
    if (!result.access_mode || result.access_mode !== 'public') {
      console.warn(`⚠️  Warning: File access_mode is "${result.access_mode || 'unknown'}", attempting to fix...`);
      
      try {
        // Update access control để force public
        const updateResult = await cloudinary.uploader.explicit(result.public_id, {
          resource_type: result.resource_type || resourceType,
          type: 'upload',
          access_mode: 'public',
          overwrite: true,
          invalidate: true
        });
        
        console.log(`✅ Access mode updated successfully!`);
        console.log(`   New access_mode: ${updateResult.access_mode || 'public'}`);
        
        // Cập nhật result với thông tin mới
        if (updateResult.secure_url) {
          result.secure_url = updateResult.secure_url;
        }
        result.access_mode = updateResult.access_mode || 'public';
      } catch (updateError) {
        console.warn(`⚠️  Could not update access_mode: ${updateError.message}`);
        console.warn(`   File may still be accessible via signed URL`);
      }
    }
    
    // Verify file is public
    if (result.access_mode && result.access_mode !== 'public') {
      console.warn(`⚠️  Warning: File access_mode is still "${result.access_mode}", expected "public"`);
      console.warn(`   You may need to configure Cloudinary dashboard settings`);
      console.warn(`   Or use signed URLs for file access`);
    }

    // Verify file is accessible
    if (!result.secure_url || !result.public_id) {
      throw new Error('Cloudinary upload succeeded but missing secure_url or public_id');
    }

    console.log(`   ✅ Buffer upload verified:`);
    console.log(`      Public ID: ${result.public_id}`);
    console.log(`      Resource Type: ${result.resource_type}`);
    console.log(`      Format: ${result.format || 'N/A'}`);
    console.log(`      Bytes: ${result.bytes}`);
    console.log(`      Access Mode: ${result.access_mode || 'public (default)'}`);

    return {
      success: true,
      public_id: result.public_id,
      secure_url: result.secure_url,
      url: result.url,
      bytes: result.bytes,
      format: result.format,
      resource_type: result.resource_type || resourceType, // Fallback to original resourceType
      created_at: result.created_at,
      access_mode: result.access_mode || 'public'
    };

  } catch (error) {
    console.error(`❌ Error uploading file buffer to Cloudinary:`, error.message);
    
    // Log chi tiết lỗi để debug
    if (error.http_code) {
      console.error(`   HTTP Code: ${error.http_code}`);
    }
    if (error.name) {
      console.error(`   Error Name: ${error.name}`);
    }
    if (error.message) {
      console.error(`   Error Message: ${error.message}`);
    }
    if (error.response) {
      console.error(`   Error Response:`, JSON.stringify(error.response, null, 2));
    }
    
    // Xử lý lỗi cụ thể
    if (error.message && (error.message.includes('untrusted') || error.message.includes('Customer is marked as untrusted'))) {
      console.error(`   ⚠️  Cloudinary account may be marked as untrusted`);
      console.error(`   💡 Try: Check Cloudinary dashboard settings for access control`);
      console.error(`   💡 Try: Verify API credentials are correct`);
      console.error(`   💡 Try: Check if account has restrictions on raw file uploads`);
    }
    
    throw error;
  }
}

// CLI usage: node cloudinary-upload.js <filePath> <processingId> <fileName>
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.error('Usage: node cloudinary-upload.js <filePath> <processingId> <fileName>');
    console.error('Example: node cloudinary-upload.js ./uploads/test.pdf doc_123 test.pdf');
    process.exit(1);
  }

  const [filePath, processingId, fileName] = args;
  
  uploadFileToCloudinary(filePath, processingId, fileName)
    .then(result => {
      console.log('\n📋 Upload Result:');
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Upload failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  uploadFileToCloudinary,
  uploadFileBufferToCloudinary
};

