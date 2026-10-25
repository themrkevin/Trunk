import { Readable } from 'node:stream';
import {
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { err, ok } from '#core/types/result';
import type { Result } from '#core/types/result';
import type { TrunkConfig } from '#core/config';
import { validateBlobKey } from '../types/blob-store.js';
import type { BlobStat, BlobStore, BlobStoreError } from '../types/blob-store.js';

const isNotFound = (error: unknown): boolean =>
  error instanceof NotFound ||
  (error instanceof S3ServiceException && error.name === 'NoSuchKey') ||
  (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404);

const mapError = (error: unknown): BlobStoreError => {
  if (isNotFound(error)) {
    return { code: 'NOT_FOUND', message: 'object does not exist' };
  }
  return {
    code: 'TRANSIENT',
    message: error instanceof Error ? error.message : String(error),
  };
};

export type S3BlobStoreOptions = {
  readonly bucket: string;
  readonly region: string;
  readonly endpoint?: string;
  readonly accessKey?: string;
  readonly secretKey?: string;
};

/**
 * S3-backed BlobStore. Credentials: explicit accessKey/secretKey win;
 * otherwise the AWS SDK default provider chain runs (env → ~/.aws → SSO →
 * instance role) — see plan discussion on IAM credential forms.
 */
export const createS3BlobStore = (options: S3BlobStoreOptions): BlobStore => {
  const hasExplicitCredentials =
    options.accessKey !== undefined &&
    options.accessKey !== '' &&
    options.secretKey !== undefined &&
    options.secretKey !== '';

  const client = new S3Client({
    region: options.region,
    endpoint: options.endpoint,
    forcePathStyle: options.endpoint !== undefined,
    credentials: hasExplicitCredentials
      ? { accessKeyId: options.accessKey as string, secretAccessKey: options.secretKey as string }
      : fromNodeProviderChain(),
  });

  return {
    async stat(key: string): Promise<Result<BlobStat, BlobStoreError>> {
      const valid = validateBlobKey(key);
      if (!valid.ok) {
        return valid;
      }
      try {
        const head = await client.send(
          new HeadObjectCommand({ Bucket: options.bucket, Key: valid.data }),
        );
        return ok({
          sizeBytes: head.ContentLength ?? 0,
          contentType: head.ContentType ?? null,
        });
      } catch (error: unknown) {
        return err(mapError(error));
      }
    },

    async openRead(key: string): Promise<Result<Readable, BlobStoreError>> {
      const valid = validateBlobKey(key);
      if (!valid.ok) {
        return valid;
      }
      try {
        const response = await client.send(
          new GetObjectCommand({ Bucket: options.bucket, Key: valid.data }),
        );
        if (response.Body === undefined) {
          return err({ code: 'TRANSIENT', message: 'GetObject returned no body' });
        }
        return ok(response.Body as Readable);
      } catch (error: unknown) {
        return err(mapError(error));
      }
    },
  };
};

export const s3BlobStoreFromConfig = (config: TrunkConfig['s3']): BlobStore =>
  createS3BlobStore({
    bucket: config.bucket,
    region: config.region,
    endpoint: config.endpoint,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  });
