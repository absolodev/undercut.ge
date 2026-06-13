export const metrics = {
  connections: 0,
  messagesPerSecond: 0,
  bytesPerSecond: 0,
  _messageCount: 0,

  startTracking(): void {
    setInterval(() => {
      this.messagesPerSecond = this._messageCount;
      this._messageCount = 0;
    }, 1000);
  },

  recordMessage(): void {
    this._messageCount++;
  },
};
