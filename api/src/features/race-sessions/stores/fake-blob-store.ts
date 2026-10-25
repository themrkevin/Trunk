import { Readable } from 'node:stream';
import { ok } from '#core/types/result';
import type { Result } from '#core/types/result';
import { validateBlobKey } from '../types/blob-store.js';
import type { BlobStat, BlobStore, BlobStoreError } from '../types/blob-store.js';

/**
 * In-memory BlobStore for tests — synthetic bytes only; tests using this
 * never parse .race content (parsing belongs to the Go worker).
 */
export const createFakeBlobStore = (
  objects: Readonly<Record<string, Uint8Array>> = {},
): BlobStore & { readonly objects: Map<string, Uint8Array> } => {
  const store = new Map<string, Uint8Array>(Object.entries(objects));

  return {
    objects: store,

    async stat(key: string): Promise<Result<BlobStat, BlobStoreError>> {
      const valid = validateBlobKey(key);
      if (!valid.ok) {
        return valid;
      }
      const data = store.get(valid.data);
      if (data === undefined) {
        return { ok: false, error: { code: 'NOT_FOUND', message: `no object at ${valid.data}` } };
      }
      return ok({ sizeBytes: data.byteLength, contentType: 'application/octet-stream' });
    },

    async openRead(key: string): Promise<Result<Readable, BlobStoreError>> {
      const valid = validateBlobKey(key);
      if (!valid.ok) {
        return valid;
      }
      const data = store.get(valid.data);
      if (data === undefined) {
        return { ok: false, error: { code: 'NOT_FOUND', message: `no object at ${valid.data}` } };
      }
      return ok(Readable.from(Buffer.from(data)));
    },
  };
};
