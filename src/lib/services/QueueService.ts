import { EventEmitter } from 'events';

interface QueueItem {
  id: string;
  task: () => Promise<any>;
  priority: number;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

class QueueService {
  private queue: QueueItem[] = [];
  private processing: boolean = false;
  private eventEmitter: EventEmitter;
  private maxConcurrent: number = 3;
  private activeRequests: number = 0;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL: number = 1000 * 60 * 5; // 5 minutes

  constructor() {
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.setMaxListeners(100);
  }

  async enqueue(id: string, task: () => Promise<any>, priority: number = 1): Promise<any> {
    // Check cache first
    const cached = this.cache.get(id);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    // Create new queue item
    const queueItem: QueueItem = {
      id,
      task,
      priority,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3
    };

    // Add to queue and sort by priority
    this.queue.push(queueItem);
    this.queue.sort((a, b) => b.priority - a.priority);

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }

    // Return promise that resolves when task completes
    return new Promise((resolve, reject) => {
      this.eventEmitter.once(`complete:${id}`, (result) => resolve(result));
      this.eventEmitter.once(`error:${id}`, (error) => reject(error));
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0 || this.activeRequests >= this.maxConcurrent) {
      return;
    }

    this.processing = true;

    try {
      while (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
        const item = this.queue.shift();
        if (!item) continue;

        this.activeRequests++;
        this.processItem(item).finally(() => {
          this.activeRequests--;
          if (this.activeRequests < this.maxConcurrent) {
            this.processQueue();
          }
        });
      }
    } finally {
      this.processing = false;
    }
  }

  private async processItem(item: QueueItem) {
    try {
      const result = await this.executeWithRetry(item);
      
      // Cache successful result
      this.cache.set(item.id, {
        data: result,
        timestamp: Date.now()
      });

      this.eventEmitter.emit(`complete:${item.id}`, result);
    } catch (error) {
      if (item.retryCount < item.maxRetries) {
        // Requeue with exponential backoff
        item.retryCount++;
        const backoffTime = Math.min(1000 * Math.pow(2, item.retryCount), 10000);
        setTimeout(() => {
          this.queue.push(item);
          this.processQueue();
        }, backoffTime);
      } else {
        this.eventEmitter.emit(`error:${item.id}`, error);
      }
    }
  }

  private async executeWithRetry(item: QueueItem): Promise<any> {
    try {
      return await item.task();
    } catch (error: any) {
      if (error.code === 'insufficient_quota' || error.code === 'rate_limit_exceeded') {
        throw error; // Don't retry quota/rate limit errors
      }
      if (item.retryCount < item.maxRetries) {
        throw error; // Let processItem handle retry
      }
      throw new Error(`Failed after ${item.maxRetries} retries: ${error.message}`);
    }
  }

  clearCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTTL) {
        this.cache.delete(key);
      }
    }
  }
}

export const queueService = new QueueService(); 