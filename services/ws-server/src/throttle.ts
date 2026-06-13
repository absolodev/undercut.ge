export class ThrottledEmitter<T> {
  private latestData: T | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly emitFn: (data: T) => void,
    private readonly intervalMs: number
  ) {
    this.timer = setInterval(() => this.flush(), intervalMs);
  }

  enqueue(data: T): void {
    this.latestData = data; // Always keep latest, discard stale
  }

  private flush(): void {
    if (this.latestData !== null) {
      this.emitFn(this.latestData);
      this.latestData = null;
    }
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
