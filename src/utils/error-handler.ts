export enum ErrorCodes {
  RETRY_EXHAUSTED = 'RETRY_EXHAUSTED',
  TIMEOUT = 'TIMEOUT',
  API_ERROR = 'API_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

export class ReviewError extends Error {
  constructor(message: string, public code: ErrorCodes, public details?: any) {
    super(message);
    this.name = 'ReviewError';
  }
}

/**
 * Retry an async operation with exponential backoff and jitter
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt > retries) {
        throw new ReviewError(
          `Operation failed after ${retries} retries: ${(error as Error).message}`,
          ErrorCodes.RETRY_EXHAUSTED,
          error
        );
      }
      // Calculate exponential backoff delay with random jitter (0-100ms)
      const backoff = delayMs * Math.pow(2, attempt - 1) + Math.random() * 100;
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
}

/**
 * Wrap an async operation with a timeout using Promise.race
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new ReviewError(`Operation timed out after ${timeoutMs}ms`, ErrorCodes.TIMEOUT));
    }, timeoutMs);
  });

  try {
    return await Promise.race([fn(), timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * Check if an error is a ReviewError instance
 */
export function isReviewError(error: unknown): error is ReviewError {
  return error instanceof ReviewError;
}

/**
 * Format any error into a readable string message
 */
export function formatError(error: unknown): string {
  if (isReviewError(error)) {
    return `[${error.code}] ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}