import { Injectable } from '@nestjs/common';

type Counter = {
  windowStartMs: number;
  hits: number;
};

@Injectable()
export class RateLimitService {
  private readonly counters = new Map<string, Counter>();
  private opCount = 0;

  hit(key: string, limit: number, windowMs: number): { allowed: boolean; hits: number; resetAtMs: number } {
    const now = Date.now();
    const existing = this.counters.get(key);

    const counter =
      existing && now - existing.windowStartMs < windowMs
        ? existing
        : { windowStartMs: now, hits: 0 };

    counter.hits += 1;
    this.counters.set(key, counter);

    this.opCount += 1;
    if (this.opCount % 250 === 0) {
      this.prune(now, windowMs);
    }

    return {
      allowed: counter.hits <= limit,
      hits: counter.hits,
      resetAtMs: counter.windowStartMs + windowMs,
    };
  }

  private prune(nowMs: number, windowMs: number) {
    // Remove stale keys (2 windows) to keep memory bounded.
    const threshold = nowMs - windowMs * 2;
    for (const [key, counter] of this.counters.entries()) {
      if (counter.windowStartMs < threshold) {
        this.counters.delete(key);
      }
    }
  }
}

