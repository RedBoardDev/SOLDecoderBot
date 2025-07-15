import { config } from '../config/env.js';
import { logger } from '../../shared/logger.js';

export class UptimeKumaService {
  private static instance: UptimeKumaService;
  private intervalId: NodeJS.Timeout | null = null;
  private isEnabled = false;
  private pushUrl: string | undefined;
  private pingInterval: number;

  private constructor() {
    this.pushUrl = config.UPTIME_KUMA_PUSH_URL;
    this.pingInterval = config.UPTIME_KUMA_PING_INTERVAL;
    this.isEnabled = !!this.pushUrl;

    if (this.isEnabled) {
      logger.info(`Uptime Kuma monitoring configured: ${this.maskUrl(this.pushUrl!)}`);
    }
  }

  public static getInstance(): UptimeKumaService {
    if (!UptimeKumaService.instance) {
      UptimeKumaService.instance = new UptimeKumaService();
    }
    return UptimeKumaService.instance;
  }

  private maskUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      const lastSlash = path.lastIndexOf('/');
      if (lastSlash > 0) {
        const maskedPath = `${path.substring(0, lastSlash + 1)}***`;
        return `${urlObj.origin}${maskedPath}`;
      }
      return `${urlObj.origin}/***`;
    } catch {
      return '***configured***';
    }
  }

  public async start(): Promise<void> {
    if (!this.isEnabled) {
      logger.info('Uptime Kuma monitoring disabled - no push URL configured');
      return;
    }

    if (this.intervalId) {
      logger.warn('Uptime Kuma service is already running');
      return;
    }

    logger.info(`Starting Uptime Kuma push monitor (interval: ${this.pingInterval / 1000}s)`);

    // Send initial ping
    const initialPingSuccess = await this.sendPing();
    if (!initialPingSuccess) {
      logger.warn('Initial Uptime Kuma ping failed - service will continue trying');
    }

    // Setup interval for regular pings
    this.intervalId = setInterval(async () => {
      await this.sendPing();
    }, this.pingInterval);

    logger.serviceInit('Uptime Kuma Push Monitor');
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Uptime Kuma push monitor stopped');
    }
  }

  private async sendPing(): Promise<boolean> {
    if (!this.pushUrl) {
      return false;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(this.pushUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'SOLDecoderBot/1.0',
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const responseText = await response.text();
        logger.debug(`Uptime Kuma ping successful: ${responseText}`);
        return true;
      } else {
        logger.warn(`Uptime Kuma ping failed with status: ${response.status} ${response.statusText}`);
        return false;
      }
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        logger.error('Uptime Kuma ping timeout (5s)');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        logger.error(`Uptime Kuma server unreachable: ${error.message}`);
      } else {
        logger.error('Failed to send Uptime Kuma ping', error);
      }
      return false;
    }
  }

  public async sendManualPing(): Promise<boolean> {
    if (!this.isEnabled) {
      logger.warn('Cannot send manual ping - Uptime Kuma monitoring is disabled');
      return false;
    }

    try {
      const success = await this.sendPing();
      if (success) {
        logger.info('Manual Uptime Kuma ping sent successfully');
      } else {
        logger.error('Manual Uptime Kuma ping failed');
      }
      return success;
    } catch (error) {
      logger.error('Failed to send manual Uptime Kuma ping', error);
      return false;
    }
  }

  public isRunning(): boolean {
    return this.isEnabled && this.intervalId !== null;
  }

  public getStatus(): { enabled: boolean; running: boolean; interval: number; url?: string } {
    return {
      enabled: this.isEnabled,
      running: this.isRunning(),
      interval: this.pingInterval,
      url: this.pushUrl ? this.maskUrl(this.pushUrl) : undefined,
    };
  }
}
