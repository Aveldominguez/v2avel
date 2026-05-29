import { lazy, ComponentType } from 'react';

const isChunkError = (err: unknown) => {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /ChunkLoadError|Loading chunk|dynamically imported module|Importing a module script failed|Failed to fetch/i.test(msg);
};

/**
 * Like React.lazy but retries the dynamic import once after a short delay
 * when it fails due to a chunk-load error (typical after a SW update or a
 * flaky network on iOS PWA resume).
 */
export const lazyWithRetry = <T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) =>
  lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      if (!isChunkError(err)) throw err;
      await new Promise((r) => setTimeout(r, 300));
      return factory();
    }
  });
