import type { Result } from '#core/types/result';
import type {
  CornerEvidenceJson,
  SessionConditionsJson,
  SessionStatsJson,
} from '#core/db/schema';

/** Stored race session as read back from persistence. */
export type RaceSessionRecord = {
  readonly id: string;
  readonly userId: string;
  readonly contentHash: string;
  readonly blobKey: string;
  readonly status: 'processing' | 'completed' | 'failed';
  readonly fileSizeBytes: number | null;
  readonly frameCount: number | null;
  readonly sampleRateHz: number | null;
  readonly durationSeconds: number | null;
  readonly carCode: number | null;
  readonly lapFirst: number | null;
  readonly lapLast: number | null;
  readonly phases: readonly string[] | null;
  readonly conditions: SessionConditionsJson | null;
  readonly stats: SessionStatsJson | null;
  readonly evidence: readonly CornerEvidenceJson[] | null;
  readonly schemaVersion: number;
  readonly error: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly extractedAt: Date | null;
};

export type ExtractionJobRecord = {
  readonly id: string;
  readonly raceSessionId: string;
  readonly userId: string;
  readonly contentHash: string;
  readonly status: 'pending' | 'processing' | 'completed' | 'failed';
  readonly streamEntryId: string | null;
  readonly attempts: number;
  readonly error: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CreateRaceSessionInput = {
  readonly userId: string;
  readonly contentHash: string;
  readonly blobKey: string;
  readonly fileSizeBytes?: number;
};

export type CompleteExtractionInput = {
  readonly fileSizeBytes: number;
  readonly frameCount: number;
  readonly sampleRateHz: number;
  readonly durationSeconds: number;
  readonly carCode: number | null;
  readonly lapFirst: number | null;
  readonly lapLast: number | null;
  readonly phases: readonly string[];
  readonly conditions: SessionConditionsJson;
  readonly stats: SessionStatsJson;
  readonly evidence: readonly CornerEvidenceJson[];
};

export type RaceSessionStoreError = {
  readonly code: 'STORE_UNAVAILABLE' | 'CONSTRAINT_VIOLATION';
  readonly message: string;
};

export type RaceSessionStore = {
  readonly findByContentHash: (
    userId: string,
    contentHash: string,
  ) => Promise<Result<RaceSessionRecord | null, RaceSessionStoreError>>;

  readonly createProcessingSession: (
    input: CreateRaceSessionInput,
  ) => Promise<Result<RaceSessionRecord, RaceSessionStoreError>>;

  readonly createJob: (
    raceSessionId: string,
    userId: string,
    contentHash: string,
  ) => Promise<Result<ExtractionJobRecord, RaceSessionStoreError>>;

  readonly findActiveJob: (
    userId: string,
    contentHash: string,
  ) => Promise<Result<ExtractionJobRecord | null, RaceSessionStoreError>>;

  readonly markJobEnqueued: (
    jobId: string,
    streamEntryId: string,
  ) => Promise<Result<void, RaceSessionStoreError>>;

  readonly markEnqueueFailed: (
    jobId: string,
    message: string,
  ) => Promise<Result<void, RaceSessionStoreError>>;

  readonly findJobById: (
    jobId: string,
  ) => Promise<Result<ExtractionJobRecord | null, RaceSessionStoreError>>;

  readonly completeExtraction: (
    jobId: string,
    payload: CompleteExtractionInput,
  ) => Promise<Result<void, RaceSessionStoreError>>;

  readonly failExtraction: (
    jobId: string,
    code: string,
    message: string,
  ) => Promise<Result<void, RaceSessionStoreError>>;
};
