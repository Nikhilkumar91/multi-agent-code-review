import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ReviewReportSchema } from '../src/types/index.js';

// Use a real generated report as the known-valid sample
const samplePath = path.resolve(process.cwd(), 'reports/udacity_cd14715-simple-todo-app_1.json');
const validReport = JSON.parse(fs.readFileSync(samplePath, 'utf-8'));
const clone = () => JSON.parse(JSON.stringify(validReport));

describe('ReviewReportSchema - valid data', () => {
  it('accepts a complete, valid report', () => {
    expect(() => ReviewReportSchema.parse(validReport)).not.toThrow();
  });

  it('accepts a score of 0 and a score of 100 (boundary values)', () => {
    const low = clone();
    low.summary.overallScore = 0;
    const high = clone();
    high.summary.overallScore = 100;
    expect(ReviewReportSchema.safeParse(low).success).toBe(true);
    expect(ReviewReportSchema.safeParse(high).success).toBe(true);
  });

  it('accepts an empty recommendations array', () => {
    const r = clone();
    r.recommendations = [];
    expect(ReviewReportSchema.safeParse(r).success).toBe(true);
  });
});

describe('ReviewReportSchema - invalid data', () => {
  it('rejects a report missing the summary', () => {
    const r = clone();
    delete r.summary;
    expect(ReviewReportSchema.safeParse(r).success).toBe(false);
  });

  it('rejects a non-numeric overallScore', () => {
    const r = clone();
    r.summary.overallScore = 'high';
    expect(ReviewReportSchema.safeParse(r).success).toBe(false);
  });

  it('rejects an invalid severity value', () => {
    const r = clone();
    r.fileReviews[0].codeQuality.issues[0].severity = 'catastrophic';
    expect(ReviewReportSchema.safeParse(r).success).toBe(false);
  });

  it('rejects a non-object input', () => {
    expect(ReviewReportSchema.safeParse('not a report').success).toBe(false);
    expect(ReviewReportSchema.safeParse(null).success).toBe(false);
  });
});

describe('JSON schema export for SDK structured output', () => {
  const jsonSchema = zodToJsonSchema(ReviewReportSchema, { $refStrategy: 'root' });
  const asText = JSON.stringify(jsonSchema);

  it('produces a non-empty JSON schema object', () => {
    expect(typeof jsonSchema).toBe('object');
    expect(Object.keys(jsonSchema).length).toBeGreaterThan(0);
  });

  it('includes the main report properties', () => {
    for (const key of ['pullRequest', 'fileReviews', 'summary', 'recommendations', 'metadata']) {
      expect(asText).toContain(`"${key}"`);
    }
  });

  it('marks properties as required', () => {
    expect(asText).toContain('"required"');
  });
});