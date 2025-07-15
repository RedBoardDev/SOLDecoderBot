import { Connection } from '@solana/web3.js';
import type { ConnectionConfig } from '@solana/web3.js';
import { logger } from '@shared/logger.js';

export interface RpcRequest<T = any> {
  id: string;
  method: string;
  params: any[];
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  priority: number;
  retryCount: number;
  maxRetries: number;
  createdAt: number;
}

export interface RpcQueueConfig {
  // Rate limiting
  maxRequestsPerSecond: number;
  maxConcurrentRequests: number;

  // Retry configuration
  defaultMaxRetries: number;
  baseRetryDelay: number;
  maxRetryDelay: number;

  // Queue management
  maxQueueSize: number;
  requestTimeout: number;

  // Connection config
  connectionConfig: ConnectionConfig;
}

export class RpcQueueService {
  private connection: Connection;
  private requestQueue: RpcRequest[] = [];
  private activeRequests = new Set<string>();
  private rateLimitTokens: number;
  private lastTokenRefill: number;
  private isProcessing = false;

  private readonly config: RpcQueueConfig;

  constructor(rpcEndpoint: string, config: Partial<RpcQueueConfig> = {}) {
    this.config = {
      // Optimized for QuickNode free tier
      maxRequestsPerSecond: 8, // Conservative limit to avoid 429s
      maxConcurrentRequests: 3, // Reduced to be safe

      // Retry configuration
      defaultMaxRetries: 3,
      baseRetryDelay: 1000,
      maxRetryDelay: 10000,

      // Queue management
      maxQueueSize: 1000,
      requestTimeout: 30000,

      // Connection config
      connectionConfig: {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 30000,
        disableRetryOnRateLimit: true, // We handle retries ourselves
      },

      ...config,
    };

    this.connection = new Connection(rpcEndpoint, this.config.connectionConfig);
    this.rateLimitTokens = this.config.maxRequestsPerSecond;
    this.lastTokenRefill = Date.now();

    // Start processing queue
    this.startQueueProcessor();

    logger.info(`RPC Queue Service initialized with ${this.config.maxRequestsPerSecond} RPS limit`);
  }

  async request<T = any>(
    method: string,
    params: any[] = [],
    options: {
      priority?: number;
      maxRetries?: number;
      timeout?: number;
    } = {},
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: RpcRequest<T> = {
        id: this.generateRequestId(),
        method,
        params,
        resolve,
        reject,
        priority: options.priority || 0,
        retryCount: 0,
        maxRetries: options.maxRetries || this.config.defaultMaxRetries,
        createdAt: Date.now(),
      };

      // Check queue size
      if (this.requestQueue.length >= this.config.maxQueueSize) {
        reject(new Error('RPC queue is full'));
        return;
      }

      // Add to queue with priority sorting
      this.requestQueue.push(request);
      this.requestQueue.sort((a, b) => b.priority - a.priority);

      // Set timeout
      const timeout = options.timeout || this.config.requestTimeout;
      setTimeout(() => {
        this.removeFromQueue(request.id);
        reject(new Error(`RPC request timeout after ${timeout}ms`));
      }, timeout);

      logger.debug(`RPC request queued: ${method} (queue size: ${this.requestQueue.length})`);
    });
  }

  private startQueueProcessor(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    while (this.isProcessing) {
      try {
        // Refill rate limit tokens
        this.refillTokens();

        // Process requests if we have tokens and capacity
        if (
          this.rateLimitTokens > 0 &&
          this.activeRequests.size < this.config.maxConcurrentRequests &&
          this.requestQueue.length > 0
        ) {
          const request = this.requestQueue.shift()!;
          this.rateLimitTokens--;
          this.activeRequests.add(request.id);

          // Process request asynchronously
          this.processRequest(request).finally(() => {
            this.activeRequests.delete(request.id);
          });
        }

        // Small delay to prevent busy waiting
        await this.sleep(10);
      } catch (error) {
        logger.error('Error in queue processor:', error);
        await this.sleep(1000);
      }
    }
  }

  private async processRequest(request: RpcRequest): Promise<void> {
    try {
      logger.debug(`⚡ Processing RPC request: ${request.method}`);

      // Make the actual RPC call
      const result = await this.makeRpcCall(request.method, request.params);
      request.resolve(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if it's a rate limit error
      if (this.isRateLimitError(errorMessage)) {
        logger.debug(`Rate limit hit for ${request.method}, retrying...`);

        if (request.retryCount < request.maxRetries) {
          await this.retryRequest(request);
          return;
        }
      }

      // Check if it's a retryable error
      if (this.isRetryableError(errorMessage) && request.retryCount < request.maxRetries) {
        await this.retryRequest(request);
        return;
      }

      // Non-retryable error or max retries reached
      logger.error(`RPC request failed: ${request.method}`, error);
      request.reject(error instanceof Error ? error : new Error(errorMessage));
    }
  }

  private async makeRpcCall(method: string, params: any[]): Promise<any> {
    // Use reflection to call the appropriate method on the connection
    const connectionMethod = (this.connection as any)[method];

    if (typeof connectionMethod !== 'function') {
      throw new Error(`Method ${method} not found on connection`);
    }

    return connectionMethod.apply(this.connection, params);
  }

  private async retryRequest(request: RpcRequest): Promise<void> {
    request.retryCount++;

    const delay = Math.min(this.config.baseRetryDelay * 2 ** (request.retryCount - 1), this.config.maxRetryDelay);

    logger.debug(`Retrying ${request.method} in ${delay}ms (attempt ${request.retryCount}/${request.maxRetries})`);

    setTimeout(() => {
      // Add back to front of queue with high priority
      request.priority = 1000;
      this.requestQueue.unshift(request);
    }, delay);
  }

  private refillTokens(): void {
    const now = Date.now();
    const timeSinceLastRefill = now - this.lastTokenRefill;

    if (timeSinceLastRefill >= 1000) {
      const tokensToAdd = Math.floor(timeSinceLastRefill / 1000) * this.config.maxRequestsPerSecond;
      this.rateLimitTokens = Math.min(this.rateLimitTokens + tokensToAdd, this.config.maxRequestsPerSecond);
      this.lastTokenRefill = now;
    }
  }

  private isRateLimitError(errorMessage: string): boolean {
    return (
      errorMessage.includes('429') || errorMessage.includes('Too Many Requests') || errorMessage.includes('rate limit')
    );
  }

  private isRetryableError(errorMessage: string): boolean {
    return (
      errorMessage.includes('timeout') ||
      errorMessage.includes('network') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('503') ||
      errorMessage.includes('502')
    );
  }

  private removeFromQueue(requestId: string): void {
    const index = this.requestQueue.findIndex((req) => req.id === requestId);
    if (index !== -1) {
      this.requestQueue.splice(index, 1);
    }
  }

  private generateRequestId(): string {
    return `rpc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Public methods for monitoring
  getQueueStats() {
    return {
      queueSize: this.requestQueue.length,
      activeRequests: this.activeRequests.size,
      rateLimitTokens: this.rateLimitTokens,
      config: this.config,
    };
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down RPC Queue Service...');
    this.isProcessing = false;

    // Wait for active requests to complete (with timeout)
    const shutdownTimeout = 5000;
    const startTime = Date.now();

    while (this.activeRequests.size > 0 && Date.now() - startTime < shutdownTimeout) {
      await this.sleep(100);
    }

    // Reject remaining queued requests
    for (const request of this.requestQueue) {
      request.reject(new Error('RPC service shutting down'));
    }

    this.requestQueue = [];
    logger.info('RPC Queue Service shut down');
  }
}
