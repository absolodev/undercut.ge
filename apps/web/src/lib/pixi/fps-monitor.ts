export class FPSMonitor {
  private lastTime: number = performance.now();
  private frames: number = 0;
  private checkIntervalMs: number = 1000;
  private warnThreshold: number = 55;

  constructor(warnThreshold = 55, checkIntervalMs = 1000) {
    this.warnThreshold = warnThreshold;
    this.checkIntervalMs = checkIntervalMs;
  }

  public tick(): void {
    const now = performance.now();
    this.frames++;

    if (now > this.lastTime + this.checkIntervalMs) {
      const fps = Math.round((this.frames * 1000) / (now - this.lastTime));
      
      if (fps < this.warnThreshold) {
        console.warn(`[Pixi Performance] FPS dropped to ${fps} (threshold is ${this.warnThreshold})`);
      }

      this.frames = 0;
      this.lastTime = now;
    }
  }
}
