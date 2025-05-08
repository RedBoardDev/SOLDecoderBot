export class RateLimiter {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private readonly intervalMs: number;

  private constructor(intervalMs: number) {
    this.intervalMs = intervalMs;
  }

  private static instance: RateLimiter;

  public static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter(1000);
    }
    return RateLimiter.instance;
  }

  public enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      this.processQueue().catch((err) => {
        console.error('RateLimiter processing error', err);
      });
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      await job();
      await new Promise((r) => setTimeout(r, this.intervalMs));
    }
    this.processing = false;
  }
}
