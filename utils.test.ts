import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ReportGenerator } from '../src/utils/report-generator.js';
import { withRetry, withTimeout, isReviewError, formatError } from '../src/utils/error-handler.js';
import { RateLimiter } from '../src/utils/rate-limiter.js';

const samplePath = path.resolve(process.cwd(), 'reports/udacity_cd14715-simple-todo-app_1.json');
const report = JSON.parse(fs.readFileSync(samplePath, 'utf-8'));

describe('ReportGenerator', () => {
  const generator = new ReportGenerator();

  it('renders a Markdown report containing the reviewed file and score', () => {
    const md = generator.generateMarkdownReport(report);
    expect(md.length).toBeGreaterThan(100);
    expect(md).toContain('clean-code.ts');
    expect(md).toContain(String(report.summary.overallScore));
  });

  it('renders an HTML report', () => {
    expect(generator.generateHTMLReport(report)).toMatch(/<html/i);
  });

  it('renders JSON that round-trips to the same summary', () => {
    const parsed = JSON.parse(generator.generateJSONReport(report));
    expect(parsed.summary.overallScore).toBe(report.summary.overallScore);
  });
});

describe('withRetry', () => {
  it('retries a failing operation until it succeeds', async () => {
    let attempts = 0;
    const result = await withRetry(
      async () => {
        attempts++;
        if (attempts < 3) throw new Error('flaky');
        return 'ok';
      },
      3,
      10
    );
    expect(result).toBe('ok');
    expect(attempts).toBe(3);
  });

  it('gives up after the retries are exhausted', async () => {
    await expect(withRetry(async () => { throw new Error('always'); }, 1, 10)).rejects.toThrow();
  });
});

describe('withTimeout', () => {
  it('rejects when the operation is too slow', async () => {
    await expect(withTimeout(() => new Promise((r) => setTimeout(r, 200)), 20)).rejects.toThrow(/timed out/i);
  });

  it('returns the result when the operation is fast enough', async () => {
    await expect(withTimeout(async () => 'done', 500)).resolves.toBe('done');
  });
});

describe('error helpers', () => {
  it('formats plain errors and unknown values', () => {
    expect(formatError(new Error('boom'))).toContain('boom');
    expect(formatError('text')).toContain('text');
    expect(isReviewError(new Error('x'))).toBe(false);
  });
});

describe('RateLimiter', () => {
  it('refuses a request larger than the token budget', () => {
    const limiter = new RateLimiter({ maxTokensPerMinute: 10 });
    expect(limiter.canProceed(11)).toBe(false);
    expect(limiter.canProceed(5)).toBe(true);
  });

  it('respects the concurrent request limit until a slot is released', async () => {
    const limiter = new RateLimiter({ maxConcurrent: 1 });
    await limiter.acquire(1);
    expect(limiter.canProceed(1)).toBe(false);
    limiter.release();
    expect(limiter.canProceed(1)).toBe(true);
  });
});
