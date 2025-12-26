/**
 * Utility to load .env file from project root
 * This ensures all files use the same .env file
 * 
 * Usage:
 *   require('./load-env');
 *   // or
 *   require('./load-env.js');
 */

const path = require('path');
const fs = require('fs');

// Get project root directory (where this file is located)
const projectRoot = __dirname;

// Path to .env file in project root
const envPath = path.join(projectRoot, '.env');

// Load environment variables
try {
  const dotenv = require('dotenv');
  
  // Check if .env file exists
  if (fs.existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    if (result.error) {
      console.warn(`⚠️ Error loading .env file: ${result.error.message}`);
    } else {
      console.log(`✅ Environment variables loaded from: ${envPath}`);
    }
  } else {
    console.warn(`⚠️ .env file not found at: ${envPath}`);
    console.warn('   Using default/process.env values');
  }
} catch (e) {
  // dotenv not installed
  console.warn('ℹ️ dotenv not found, using default/process.env values');
  console.warn(`   Error: ${e.message}`);
}

// Export the env path for reference
module.exports = {
  envPath,
  projectRoot
};

