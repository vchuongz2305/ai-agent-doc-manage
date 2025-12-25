/**
 * Cache system cho Gemini API để tránh gọi lại cùng một file
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class GeminiCache {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || path.join(__dirname, '../cache/gemini');
    this.ttl = options.ttl || 24 * 60 * 60 * 1000; // 24 giờ
    this.ensureCacheDir();
  }

  /**
   * Tạo cache directory nếu chưa có
   */
  async ensureCacheDir() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      console.error('Error creating cache directory:', error);
    }
  }

  /**
   * Tạo hash key từ file content hoặc file name
   */
  generateKey(fileName, fileContent) {
    const content = fileContent || fileName;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Lấy cache path
   */
  getCachePath(key) {
    return path.join(this.cacheDir, `${key}.json`);
  }

  /**
   * Lấy từ cache
   */
  async get(fileName, fileContent) {
    try {
      const key = this.generateKey(fileName, fileContent);
      const cachePath = this.getCachePath(key);
      
      const data = await fs.readFile(cachePath, 'utf8');
      const cached = JSON.parse(data);
      
      // Kiểm tra TTL
      const now = Date.now();
      if (now - cached.timestamp > this.ttl) {
        // Cache đã hết hạn
        await fs.unlink(cachePath).catch(() => {});
        return null;
      }
      
      console.log(`✅ Cache hit: ${fileName}`);
      return cached.result;
    } catch (error) {
      // Cache không tồn tại hoặc lỗi
      return null;
    }
  }

  /**
   * Lưu vào cache
   */
  async set(fileName, fileContent, result) {
    try {
      const key = this.generateKey(fileName, fileContent);
      const cachePath = this.getCachePath(key);
      
      const cached = {
        fileName,
        timestamp: Date.now(),
        result
      };
      
      await fs.writeFile(cachePath, JSON.stringify(cached, null, 2), 'utf8');
      console.log(`💾 Cache saved: ${fileName}`);
    } catch (error) {
      console.error('Error saving cache:', error);
    }
  }

  /**
   * Xóa cache cũ (older than TTL)
   */
  async clean() {
    try {
      const files = await fs.readdir(this.cacheDir);
      const now = Date.now();
      let cleaned = 0;
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(this.cacheDir, file);
        const data = await fs.readFile(filePath, 'utf8');
        const cached = JSON.parse(data);
        
        if (now - cached.timestamp > this.ttl) {
          await fs.unlink(filePath).catch(() => {});
          cleaned++;
        }
      }
      
      console.log(`🧹 Cleaned ${cleaned} expired cache files`);
    } catch (error) {
      console.error('Error cleaning cache:', error);
    }
  }

  /**
   * Xóa tất cả cache
   */
  async clear() {
    try {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(this.cacheDir, file)).catch(() => {});
        }
      }
      console.log('🗑️ Cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
}

// Singleton instance
let globalCache = null;

function getGeminiCache(options) {
  if (!globalCache) {
    globalCache = new GeminiCache(options);
  }
  return globalCache;
}

module.exports = {
  GeminiCache,
  getGeminiCache
};

