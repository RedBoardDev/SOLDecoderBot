import { RpcQueueService } from './rpc-queue-service.js';
import { logger } from '@shared/logger.js';

export class RpcServiceManager {
  private static instance: RpcServiceManager;
  private rpcService: RpcQueueService | null = null;

  private constructor() {}

  static getInstance(): RpcServiceManager {
    if (!RpcServiceManager.instance) {
      RpcServiceManager.instance = new RpcServiceManager();
    }
    return RpcServiceManager.instance;
  }

  initialize(rpcEndpoint: string): void {
    if (this.rpcService) {
      logger.warn('RPC Service already initialized');
      return;
    }

    this.rpcService = new RpcQueueService(rpcEndpoint, {
      maxRequestsPerSecond: 8, // Conservative for QuickNode free tier
      maxConcurrentRequests: 3,
      defaultMaxRetries: 3,
      baseRetryDelay: 1000,
      maxRetryDelay: 10000,
      maxQueueSize: 1000,
      requestTimeout: 30000,
    });

    logger.serviceInit('Global RPC Service Manager');
  }

  getRpcService(): RpcQueueService {
    if (!this.rpcService) {
      throw new Error('RPC Service not initialized. Call initialize() first.');
    }
    return this.rpcService;
  }

  async shutdown(): Promise<void> {
    if (this.rpcService) {
      await this.rpcService.shutdown();
      this.rpcService = null;
      logger.info('RPC Service Manager shutdown completed');
    }
  }

  getStats() {
    return this.rpcService?.getQueueStats() || null;
  }
}
