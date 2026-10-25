import { and, desc, eq, inArray } from 'drizzle-orm';
import { err, ok } from '#core/types/result';
import type { Result } from '#core/types/result';
import type { Database } from '#core/db/client';
import { extractionJobs, raceSessions } from '#core/db/schema';
import type {
  CompleteExtractionInput,
  CreateRaceSessionInput,
  ExtractionJobRecord,
  RaceSessionRecord,
  RaceSessionStore,
  RaceSessionStoreError,
} from '../types/race-session-store.js';

type SessionRow = typeof raceSessions.$inferSelect;
type JobRow = typeof extractionJobs.$inferSelect;

const toSessionRecord = (row: SessionRow): RaceSessionRecord => ({
  id: row.id,
  userId: row.userId,
  contentHash: row.contentHash,
  blobKey: row.blobKey,
  status: row.status,
  fileSizeBytes: row.fileSizeBytes,
  frameCount: row.frameCount,
  sampleRateHz: row.sampleRateHz,
  durationSeconds: row.durationSeconds,
  carCode: row.carCode,
  lapFirst: row.lapFirst,
  lapLast: row.lapLast,
  phases: row.phases,
  conditions: row.conditions,
  stats: row.stats,
  evidence: row.evidence,
  schemaVersion: row.schemaVersion,
  error: row.error,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  extractedAt: row.extractedAt,
});

const toJobRecord = (row: JobRow): ExtractionJobRecord => ({
  id: row.id,
  raceSessionId: row.raceSessionId,
  userId: row.userId,
  contentHash: row.contentHash,
  status: row.status,
  streamEntryId: row.streamEntryId,
  attempts: row.attempts,
  error: row.error,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const storeError = (error: unknown): RaceSessionStoreError => ({
  code: 'STORE_UNAVAILABLE',
  message: error instanceof Error ? error.message : String(error),
});

/** Runs a store operation, mapping any thrown error to STORE_UNAVAILABLE. */
const withStoreError = async <T>(
  operation: () => Promise<T>,
): Promise<Result<T, RaceSessionStoreError>> => {
  try {
    return ok(await operation());
  } catch (error: unknown) {
    return err(storeError(error));
  }
};

export const createDrizzleRaceSessionStore = (db: Database): RaceSessionStore => ({
  findByContentHash: (userId, contentHash) =>
    withStoreError(async () => {
      const rows = await db
        .select()
        .from(raceSessions)
        .where(and(eq(raceSessions.userId, userId), eq(raceSessions.contentHash, contentHash)))
        .limit(1);
      return rows.length === 0 ? null : toSessionRecord(rows[0]);
    }),

  createProcessingSession: (input: CreateRaceSessionInput) =>
    withStoreError(async () => {
      const rows = await db
        .insert(raceSessions)
        .values({
          userId: input.userId,
          contentHash: input.contentHash,
          blobKey: input.blobKey,
          fileSizeBytes: input.fileSizeBytes ?? null,
          status: 'processing',
        })
        .returning();
      return toSessionRecord(rows[0]);
    }),

  createJob: (raceSessionId, userId, contentHash) =>
    withStoreError(async () => {
      const rows = await db
        .insert(extractionJobs)
        .values({ raceSessionId, userId, contentHash, status: 'pending' })
        .returning();
      return toJobRecord(rows[0]);
    }),

  findActiveJob: (userId, contentHash) =>
    withStoreError(async () => {
      const rows = await db
        .select()
        .from(extractionJobs)
        .where(
          and(
            eq(extractionJobs.userId, userId),
            eq(extractionJobs.contentHash, contentHash),
            inArray(extractionJobs.status, ['pending', 'processing']),
          ),
        )
        .orderBy(desc(extractionJobs.createdAt))
        .limit(1);
      return rows.length === 0 ? null : toJobRecord(rows[0]);
    }),

  markJobEnqueued: (jobId, streamEntryId) =>
    withStoreError(async () => {
      await db
        .update(extractionJobs)
        .set({ streamEntryId, status: 'processing', updatedAt: new Date() })
        .where(eq(extractionJobs.id, jobId));
    }),

  markEnqueueFailed: (jobId, message) =>
    withStoreError(async () => {
      await db
        .update(extractionJobs)
        .set({ status: 'failed', error: `ENQUEUE_FAILED: ${message}`, updatedAt: new Date() })
        .where(eq(extractionJobs.id, jobId));
    }),

  findJobById: (jobId) =>
    withStoreError(async () => {
      const rows = await db
        .select()
        .from(extractionJobs)
        .where(eq(extractionJobs.id, jobId))
        .limit(1);
      return rows.length === 0 ? null : toJobRecord(rows[0]);
    }),

  completeExtraction: (jobId, payload: CompleteExtractionInput) =>
    withStoreError(async () => {
      await db.transaction(async (tx) => {
        const jobRows = await tx
          .select()
          .from(extractionJobs)
          .where(eq(extractionJobs.id, jobId))
          .limit(1);
        if (jobRows.length === 0) {
          throw new Error(`job not found: ${jobId}`);
        }
        const sessionId = jobRows[0].raceSessionId;

        await tx
          .update(raceSessions)
          .set({
            status: 'completed',
            fileSizeBytes: payload.fileSizeBytes,
            frameCount: payload.frameCount,
            sampleRateHz: payload.sampleRateHz,
            durationSeconds: payload.durationSeconds,
            carCode: payload.carCode,
            lapFirst: payload.lapFirst,
            lapLast: payload.lapLast,
            phases: payload.phases,
            conditions: payload.conditions,
            stats: payload.stats,
            evidence: payload.evidence,
            extractedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(raceSessions.id, sessionId));

        await tx
          .update(extractionJobs)
          .set({ status: 'completed', updatedAt: new Date() })
          .where(eq(extractionJobs.id, jobId));
      });
    }),

  failExtraction: (jobId, code, message) =>
    withStoreError(async () => {
      await db.transaction(async (tx) => {
        const jobRows = await tx
          .select()
          .from(extractionJobs)
          .where(eq(extractionJobs.id, jobId))
          .limit(1);
        if (jobRows.length === 0) {
          throw new Error(`job not found: ${jobId}`);
        }
        const sessionId = jobRows[0].raceSessionId;

        await tx
          .update(raceSessions)
          .set({ status: 'failed', error: `${code}: ${message}`, updatedAt: new Date() })
          .where(eq(raceSessions.id, sessionId));

        await tx
          .update(extractionJobs)
          .set({ status: 'failed', error: `${code}: ${message}`, updatedAt: new Date() })
          .where(eq(extractionJobs.id, jobId));
      });
    }),
});
