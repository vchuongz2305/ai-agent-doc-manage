/**
 * Script download file từ Cloudinary
 * Sử dụng để download file PDF từ Cloudinary về backend
 */

const path = require('path');
const fs = require('fs');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Cấu hình Cloudinary từ environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Download file từ Cloudinary bằng public_id
 * @param {string} publicId - Public ID của file trên Cloudinary
 * @param {string} outputPath - Đường dẫn để lưu file (optional)
 * @returns {Promise<Object>} - Buffer của file và metadata
 */
async function downloadFileFromCloudinary(publicId, outputPath = null) {
  try {
    // Validate Cloudinary config
    if (!cloudinary.config().cloud_name || !cloudinary.config().api_key || !cloudinary.config().api_secret) {
      throw new Error('Cloudinary credentials not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env file');
    }

    console.log(`📥 Downloading file from Cloudinary...`);
    console.log(`   Public ID: ${publicId}`);

    // Xác định resource_type dựa trên public_id
    // Mặc định là 'raw' cho documents và PDFs
    let resourceType = 'raw';
    
    // Kiểm tra extension để xác định resource_type
    const lowerPublicId = publicId.toLowerCase();
    if (lowerPublicId.includes('.pdf') || 
        lowerPublicId.includes('.doc') || 
        lowerPublicId.includes('.docx') ||
        lowerPublicId.includes('.xls') ||
        lowerPublicId.includes('.xlsx') ||
        lowerPublicId.includes('.txt') ||
        lowerPublicId.includes('documents/')) {
      resourceType = 'raw';
    } else if (lowerPublicId.includes('.jpg') || 
               lowerPublicId.includes('.jpeg') || 
               lowerPublicId.includes('.png') || 
               lowerPublicId.includes('.gif')) {
      resourceType = 'image';
    } else if (lowerPublicId.includes('.mp4') || 
               lowerPublicId.includes('.mov') || 
               lowerPublicId.includes('.avi')) {
      resourceType = 'video';
    }
    
    console.log(`   Detected resource_type: ${resourceType} for public_id: ${publicId}`);
    
    // Thử dùng unsigned URL trước (cho file public)
    let url = cloudinary.url(publicId, {
      resource_type: resourceType,
      secure: true,
      sign_url: false // Không dùng signed URL trước
    });

    console.log(`   URL (unsigned): ${url}`);
    console.log(`   Resource Type: ${resourceType}`);

    let fileBuffer;
    let downloadSuccess = false;

    // Thử download với unsigned URL trước
    try {
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'arraybuffer',
        timeout: 60000,
        validateStatus: function (status) {
          return status >= 200 && status < 400;
        }
      });
      
      if (response.status === 200) {
        fileBuffer = Buffer.from(response.data);
        downloadSuccess = true;
        console.log(`✅ File downloaded successfully with unsigned URL!`);
      }
    } catch (unsignedError) {
      console.log(`⚠️  Unsigned URL failed (status: ${unsignedError.response?.status}), trying signed URL...`);
    }

    // Nếu unsigned URL fail, thử signed URL
    if (!downloadSuccess) {
      url = cloudinary.url(publicId, {
        resource_type: resourceType,
        secure: true,
        sign_url: true // Dùng signed URL
      });

      console.log(`   URL (signed): ${url}`);

      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'arraybuffer',
        timeout: 60000
      });

      fileBuffer = Buffer.from(response.data);
      downloadSuccess = true;
      console.log(`✅ File downloaded successfully with signed URL!`);
    }
    
    if (!fileBuffer) {
      throw new Error('Failed to download file from Cloudinary');
    }
    
    console.log(`✅ File downloaded successfully!`);
    console.log(`   Size: ${fileBuffer.length} bytes`);

    // Extract format from public_id extension
    let format = 'pdf'; // default
    if (publicId.includes('.pdf')) {
      format = 'pdf';
    } else if (publicId.includes('.doc') || publicId.includes('.docx')) {
      format = 'doc';
    } else if (publicId.includes('.xls') || publicId.includes('.xlsx')) {
      format = 'xls';
    } else if (publicId.includes('.txt')) {
      format = 'txt';
    }

    // Lưu file nếu có outputPath
    if (outputPath) {
      // Tạo directory nếu chưa tồn tại
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(outputPath, fileBuffer);
      console.log(`   Saved to: ${outputPath}`);
    }

    return {
      success: true,
      buffer: fileBuffer,
      size: fileBuffer.length,
      format: format,
      public_id: publicId,
      url: url,
      saved: !!outputPath,
      outputPath: outputPath
    };

  } catch (error) {
    console.error(`❌ Error downloading file from Cloudinary:`, error.message);
    
    // Kiểm tra nếu file không tồn tại
    if (error.response && error.response.status === 404) {
      throw new Error(`File not found on Cloudinary: ${publicId}`);
    }
    
    throw error;
  }
}

/**
 * Extract public_id from Cloudinary URL
 * @param {string} cloudinaryUrl - URL của file trên Cloudinary
 * @returns {string} - Public ID
 */
function extractPublicIdFromUrl(cloudinaryUrl) {
  // URL format: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{version}/{public_id}
  // Example: https://res.cloudinary.com/diaogiqvy/raw/upload/v1766635347/documents/doc_xxx/file.pdf
  // Example with signed: https://res.cloudinary.com/.../raw/upload/s--signature--/v1766635347/documents/doc_xxx/file.pdf
  
  // First try: regex pattern matching
  const urlPattern = /res\.cloudinary\.com\/[^\/]+\/(?:image|video|raw|auto)\/upload\/(?:s--[^-]+--\/)?(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/;
  const match = cloudinaryUrl.match(urlPattern);
  
  if (match && match[1]) {
    const publicId = match[1];
    console.log(`   ✅ Extracted public_id from URL using regex: ${publicId}`);
    return publicId;
  }
  
  // Fallback: try to extract from path
  try {
    const urlObj = new URL(cloudinaryUrl);
    const pathParts = urlObj.pathname.split('/');
    const uploadIndex = pathParts.indexOf('upload');
    
    if (uploadIndex >= 0 && uploadIndex < pathParts.length - 1) {
      // Skip signature if present (format: s--signature--)
      let startIndex = uploadIndex + 1;
      const signaturePattern = /^s--[^-]+--$/;
      if (signaturePattern.test(pathParts[startIndex])) {
        startIndex++; // Skip signature
      }
      
      // Skip version number if present (format: v1234567890)
      const versionPattern = /^v\d+$/;
      if (versionPattern.test(pathParts[startIndex])) {
        startIndex++; // Skip version
      }
      
      // Join remaining parts as public_id
      const publicId = pathParts.slice(startIndex).join('/');
      // Remove file extension if present (Cloudinary might add it)
      const publicIdWithoutExt = publicId.replace(/\.[^.]+$/, '');
      
      console.log(`   ✅ Extracted public_id from URL using path parsing: ${publicIdWithoutExt}`);
      return publicIdWithoutExt;
    }
  } catch (e) {
    console.log(`   ⚠️  Failed to parse URL: ${e.message}`);
    // Invalid URL, try regex fallback
  }
  
  throw new Error(`Cannot extract public_id from URL: ${cloudinaryUrl}`);
}

/**
 * Download file từ Cloudinary bằng URL
 * @param {string} cloudinaryUrl - URL của file trên Cloudinary
 * @param {string} outputPath - Đường dẫn để lưu file (optional)
 * @returns {Promise<Object>} - Buffer của file và metadata
 */
async function downloadFileFromCloudinaryUrl(cloudinaryUrl, outputPath = null) {
  try {
    console.log(`📥 Downloading file from Cloudinary URL...`);
    console.log(`   URL: ${cloudinaryUrl}`);

    // Extract public_id from URL and use the robust download function
    try {
      const publicId = extractPublicIdFromUrl(cloudinaryUrl);
      console.log(`   Extracted Public ID: ${publicId}`);
      
      // Use the robust download function that handles signed/unsigned URLs
      const result = await downloadFileFromCloudinary(publicId, outputPath);
      
      return {
        success: true,
        buffer: result.buffer,
        size: result.size,
        format: result.format,
        url: cloudinaryUrl,
        public_id: publicId,
        saved: !!outputPath,
        outputPath: outputPath
      };
    } catch (extractError) {
      console.log(`⚠️  Could not extract public_id, trying direct URL download...`);
      console.log(`   Error: ${extractError.message}`);
      
      // Fallback to direct URL download if extraction fails
      const response = await axios({
        method: 'GET',
        url: cloudinaryUrl,
        responseType: 'arraybuffer',
        timeout: 60000,
        validateStatus: function (status) {
          return status >= 200 && status < 400;
        }
      });

      const fileBuffer = Buffer.from(response.data);
      
      console.log(`✅ File downloaded successfully from direct URL!`);
      console.log(`   Size: ${fileBuffer.length} bytes`);

      // Lưu file nếu có outputPath
      if (outputPath) {
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(outputPath, fileBuffer);
        console.log(`   Saved to: ${outputPath}`);
      }

      return {
        success: true,
        buffer: fileBuffer,
        size: fileBuffer.length,
        format: cloudinaryUrl.includes('.pdf') ? 'pdf' : undefined,
        url: cloudinaryUrl,
        saved: !!outputPath,
        outputPath: outputPath
      };
    }

  } catch (error) {
    console.error(`❌ Error downloading file from Cloudinary URL:`, error.message);
    
    if (error.response && error.response.status === 404) {
      throw new Error(`File not found at URL: ${cloudinaryUrl}`);
    }
    
    throw error;
  }
}

/**
 * Lấy thông tin file từ Cloudinary (không download)
 * @param {string} publicId - Public ID của file
 * @returns {Promise<Object>} - Metadata của file
 */
async function getFileInfoFromCloudinary(publicId) {
  try {
    // Validate Cloudinary config
    if (!cloudinary.config().cloud_name || !cloudinary.config().api_key || !cloudinary.config().api_secret) {
      throw new Error('Cloudinary credentials not configured');
    }

    console.log(`🔍 Getting file info from Cloudinary...`);
    console.log(`   Public ID: ${publicId}`);

    // Lấy thông tin file
    const result = await cloudinary.api.resource(publicId, {
      resource_type: 'auto'
    });

    console.log(`✅ File info retrieved successfully!`);
    console.log(`   Public ID: ${result.public_id}`);
    console.log(`   Size: ${result.bytes} bytes`);
    console.log(`   Format: ${result.format}`);
    console.log(`   Created: ${result.created_at}`);

    return {
      success: true,
      public_id: result.public_id,
      secure_url: result.secure_url,
      url: result.url,
      bytes: result.bytes,
      format: result.format,
      resource_type: result.resource_type,
      created_at: result.created_at,
      width: result.width,
      height: result.height
    };

  } catch (error) {
    console.error(`❌ Error getting file info from Cloudinary:`, error.message);
    
    if (error.http_code === 404) {
      throw new Error(`File not found on Cloudinary: ${publicId}`);
    }
    
    throw error;
  }
}

// CLI usage: node cloudinary-download.js <publicId> [outputPath]
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: node cloudinary-download.js <publicId> [outputPath]');
    console.error('Example: node cloudinary-download.js documents/doc_123/test.pdf ./downloads/test.pdf');
    console.error('Or: node cloudinary-download.js <cloudinaryUrl> [outputPath]');
    process.exit(1);
  }

  const [identifier, outputPath] = args;
  
  // Kiểm tra nếu là URL hay public_id
  const isUrl = identifier.startsWith('http://') || identifier.startsWith('https://');
  
  const downloadFunction = isUrl 
    ? downloadFileFromCloudinaryUrl(identifier, outputPath)
    : downloadFileFromCloudinary(identifier, outputPath);
  
  downloadFunction
    .then(result => {
      console.log('\n📋 Download Result:');
      console.log(JSON.stringify({
        success: result.success,
        size: result.size,
        saved: result.saved,
        outputPath: result.outputPath
      }, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Download failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  downloadFileFromCloudinary,
  downloadFileFromCloudinaryUrl,
  getFileInfoFromCloudinary
};

