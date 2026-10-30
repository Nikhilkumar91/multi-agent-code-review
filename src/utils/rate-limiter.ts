interface RequestRecord {
  timestamp: number;
  tokens: number;
}

export interface RateLimiterOptions {
  maxRequestsPerMinute?: number;
  maxTokensPerMinute?: number;
  maxConcurrent?: number;
}

export class RateLimiter {
  private maxRequestsPerMinute: number;
  private maxTokensPerMinute: number;
  private maxConcurrent: number;
  private requestHistory: RequestRecord[] = [];
  private activeRequests = 0;
  private waitQueue: (() => void)[] = [];

  constructor(options: RateLimiterOptions = {}) {
    this.maxRequestsPerMinute = options.maxRequestsPerMinute || 50;
    this.maxTokensPerMinute = options.maxTokensPerMinute || 40000;
    this.maxConcurrent = options.maxConcurrent || 3;
  }

  /**
   * Prune records older than 60 seconds (sliding window)
   */
  private pruneOldRecords(): void {
    const now = Date.now();
    const windowStart = now - 60000;
    this.requestHistory = this.requestHistory.filter(
      (record) => record.timestamp > windowStart
    );
  }

  /**
   * Check if a request can proceed immediately based on limits
   */
  canProceed(estimatedTokens: number): boolean {
    this.pruneOldRecords();

    if (this.activeRequests >= this.maxConcurrent) {
      return false;
    }

    const currentRequests = this.requestHistory.length;
    if (currentRequests >= this.maxRequestsPerMinute) {
      return false;
    }

    const currentTokens = this.requestHistory.reduce(
      (sum, record) => sum + record.tokens,
      0
    );
    if (currentTokens + estimatedTokens > this.maxTokensPerMinute) {
      return false;
    }

    return true;
  }

  /**
   * Wait for a concurrent request slot
   */
  private async waitForSlot(): Promise<void> {
    if (this.activeRequests < this.maxConcurrent) {
      return;
    }
    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  /**
   * Wait until rate limits allow the request
   */
  private async waitForRateLimit(estimatedTokens: number): Promise<void> {
    while (!this.canProceed(estimatedTokens)) {
      // Calculate delay until oldest record expires or check every 500ms
      const oldestRecord = this.requestHistory[0];
      const waitTime = oldestRecord
        ? Math.max(100, oldestRecord.timestamp + 60000 - Date.now())
        : 500;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Acquire a rate limit slot for a request
   */
  async acquire(estimatedTokens = 1000): Promise<void> {
    await this.waitForSlot();
    await this.waitForRateLimit(estimatedTokens);

    this.activeRequests++;
    this.requestHistory.push({
      timestamp: Date.now(),
      tokens: estimatedTokens,
    });
  }

  /**
   * Release an active request slot
   */
  release(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      if (next) next();
    }
  }
}

/**
 * Global rate limiter instance for convenience
 */
export const globalRateLimiter = new RateLimiter();

/**
 * Utility wrapper to execute an operation with rate limiting
 */
export async function withRateLimit<T>(
  fn: () => Promise<T>,
  estimatedTokens = 1000
): Promise<T> {
  await globalRateLimiter.acquire(estimatedTokens);
  try {
    return await fn();
  } finally {
    globalRateLimiter.release();
  }
}