import type { Readable } from 'node:stream';
import type { Result } from '#core/types/result';

export type BlobStat = {
  readonly sizeBytes: number;
  readonly contentType: string | null;
};

export type BlobStoreError =
  | { readonly code: 'NOT_FOUND'; readonly message: string }
  | { readonly code: 'INVALID_KEY'; readonly message: string }
  | { readonly code: 'TRANSIENT'; readonly message: string };

/**
 * BlobStore — read-only object access for .race files.
 * Keys are validated before any store call: non-empty, no traversal, .race suffix.
 */
export type BlobStore = {
  readonly stat: (key: string) => Promise<Result<BlobStat, BlobStoreError>>;
  readonly openRead: (key: string) => Promise<Result<Readable, BlobStoreError>>;
};

const KEY_PATTERN = /^[\w./-]+\.race$/;

export const validateBlobKey = (key: string): Result<string, BlobStoreError> => {
  if (key.trim().length === 0) {
    return { ok: false, error: { code: 'INVALID_KEY', message: 'blob key must not be empty' } };
  }
  if (key.includes('..') || key.startsWith('/') || key.includes('\\')) {
    return { ok: false, error: { code: 'INVALID_KEY', message: 'blob key contains traversal' } };
  }
  if (!KEY_PATTERN.test(key)) {
    return { ok: false, error: { code: 'INVALID_KEY', message: 'blob key must end in .race and contain only safe characters' } };
  }
  return { ok: true, data: key };
};
