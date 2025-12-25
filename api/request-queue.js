/**
 * Request Queue System để tránh rate limit
 * Queue các request và xử lý tuần tự với delay
 */

class RequestQueue {
  constructor(options = {}) {
    this.queue = [];
    this.processing = false;
    this.delayBetweenRequests = options.delayBetweenRequests || 20000; // 20 giây
    this.maxConcurrent = options.maxConcurrent || 1;
    this.currentConcurrent = 0;
  }

  /**
   * Thêm request vào queue
   */
  async add(requestFn, priority = 0) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        fn: requestFn,
        priority,
        resolve,
        reject,
        addedAt: Date.now()
      });
      
      // Sort theo priority (cao hơn = ưu tiên hơn)
      this.queue.sort((a, b) => b.priority - a.priority);
      
      // Bắt đầu xử lý nếu chưa đang xử lý
      if (!this.processing) {
        this.process();
      }
    });
  }

  /**
   * Xử lý queue
   */
  async process() {
    if (this.processing && this.currentConcurrent >= this.maxConcurrent) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      // Đợi nếu đã đạt max concurrent
      while (this.currentConcurrent >= this.maxConcurrent) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const item = this.queue.shift();
      if (!item) break;

      this.currentConcurrent++;

      // Xử lý request
      item.fn()
        .then(result => {
          this.currentConcurrent--;
          item.resolve(result);
        })
        .catch(error => {
          this.currentConcurrent--;
          item.reject(error);
        });

      // Delay giữa các request (trừ request cuối)
      if (this.queue.length > 0) {
        console.log(`⏳ Queue: Đợi ${this.delayBetweenRequests/1000}s trước request tiếp theo...`);
        await new Promise(resolve => setTimeout(resolve, this.delayBetweenRequests));
      }
    }

    // Đợi tất cả request hoàn thành
    while (this.currentConcurrent > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.processing = false;
    console.log('✅ Queue: Tất cả request đã hoàn thành');
  }

  /**
   * Lấy số lượng request đang chờ
   */
  getQueueLength() {
    return this.queue.length;
  }

  /**
   * Xóa tất cả request trong queue
   */
  clear() {
    this.queue = [];
  }
}

// Singleton instance
let globalQueue = null;

/**
 * Get hoặc tạo global queue
 */
function getRequestQueue(options) {
  if (!globalQueue) {
    globalQueue = new RequestQueue(options);
  }
  return globalQueue;
}

module.exports = {
  RequestQueue,
  getRequestQueue
};

