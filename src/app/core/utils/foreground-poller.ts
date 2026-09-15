/** Poll only while the owning screen, browser tab and network are active. */
export class ForegroundPoller {
  private active = false;
  private running = false;
  private timer?: ReturnType<typeof setTimeout>;
  private readonly wake = () => {
    clearTimeout(this.timer);
    if (this.canPoll() && !this.running) void this.run();
  };

  constructor(
    private readonly task: () => Promise<void>,
    private readonly delayMs: number,
  ) {}

  start(): void {
    if (this.active) return;
    this.active = true;
    document.addEventListener('visibilitychange', this.wake);
    window.addEventListener('online', this.wake);
    window.addEventListener('offline', this.wake);
    this.wake();
  }

  stop(): void {
    this.active = false;
    clearTimeout(this.timer);
    document.removeEventListener('visibilitychange', this.wake);
    window.removeEventListener('online', this.wake);
    window.removeEventListener('offline', this.wake);
  }

  private canPoll(): boolean {
    return this.active && !document.hidden && navigator.onLine;
  }

  private async run(): Promise<void> {
    this.running = true;
    let delay = this.delayMs;
    try {
      await this.task();
    } catch {
      // No sensitive payload logging and no immediate retry storm.
      delay = Math.min(this.delayMs * 3, 60_000);
    } finally {
      this.running = false;
      if (this.canPoll()) this.timer = setTimeout(this.wake, delay);
    }
  }
}
