import { randomUUID } from 'node:crypto';
import { ok } from '#core/types/result';
import type { Result } from '#core/types/result';
import type {
  CompleteExtractionInput,
  CreateRaceSessionInput,
  ExtractionJobRecord,
  RaceSessionRecord,
  RaceSessionStore,
  RaceSessionStoreError,
} from '../types/race-session-store.js';

/**
 * In-memory RaceSessionStore for tests — mirrors the fake-provider pattern:
 * no database, deterministic, inspectable state.
 */
export const createInMemoryRaceSessionStore = (): RaceSessionStore & {
  readonly sessions: Map<string, RaceSessionRecord>;
  readonly jobs: Map<string, ExtractionJobRecord>;
} => {
  const sessions = new Map<string, RaceSessionRecord>();
  const jobs = new Map<string, ExtractionJobRecord>();

  const findByContentHash = async (
    userId: string,
    contentHash: string,
  ): Promise<Result<RaceSessionRecord | null, RaceSessionStoreError>> => {
    const match = [...sessions.values()].find(
      (session) => session.userId === userId && session.contentHash === contentHash,
    );
    return ok(match ?? null);
  };

  return {
    sessions,
    jobs,

    findByContentHash,

    async createProcessingSession(input: CreateRaceSessionInput) {
      const now = new Date();
      const record: RaceSessionRecord = {
        id: randomUUID(),
        userId: input.userId,
        contentHash: input.contentHash,
        blobKey: input.blobKey,
        status: 'processing',
        fileSizeBytes: input.fileSizeBytes ?? null,
        frameCount: null,
        sampleRateHz: null,
        durationSeconds: null,
        carCode: null,
        lapFirst: null,
        lapLast: null,
        phases: null,
        conditions: null,
        stats: null,
        evidence: null,
        schemaVersion: 1,
        error: null,
        createdAt: now,
        updatedAt: now,
        extractedAt: null,
      };
      sessions.set(record.id, record);
      return ok(record);
    },

    async createJob(raceSessionId, userId, contentHash) {
      const now = new Date();
      const job: ExtractionJobRecord = {
        id: randomUUID(),
        raceSessionId,
        userId,
        contentHash,
        status: 'pending',
        streamEntryId: null,
        attempts: 0,
        error: null,
        createdAt: now,
        updatedAt: now,
      };
      jobs.set(job.id, job);
      return ok(job);
    },

    async findActiveJob(userId, contentHash) {
      const active = [...jobs.values()]
        .filter(
          (job) =>
            job.userId === userId &&
            job.contentHash === contentHash &&
            (job.status === 'pending' || job.status === 'processing'),
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return ok(active[0] ?? null);
    },

    async markJobEnqueued(jobId, streamEntryId) {
      const job = jobs.get(jobId);
      if (job !== undefined) {
        jobs.set(jobId, { ...job, streamEntryId, status: 'processing', updatedAt: new Date() });
      }
      return ok(undefined);
    },

    async markEnqueueFailed(jobId, message) {
      const job = jobs.get(jobId);
      if (job !== undefined) {
        jobs.set(jobId, {
          ...job,
          status: 'failed',
          error: `ENQUEUE_FAILED: ${message}`,
          updatedAt: new Date(),
        });
      }
      return ok(undefined);
    },

    async findJobById(jobId) {
      return ok(jobs.get(jobId) ?? null);
    },

    async completeExtraction(jobId, payload: CompleteExtractionInput) {
      const job = jobs.get(jobId);
      if (job === undefined) {
        return ok(undefined);
      }
      const session = sessions.get(job.raceSessionId);
      if (session !== undefined) {
        sessions.set(job.raceSessionId, {
          ...session,
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
        });
      }
      jobs.set(jobId, { ...job, status: 'completed', updatedAt: new Date() });
      return ok(undefined);
    },

    async failExtraction(jobId, code, message) {
      const job = jobs.get(jobId);
      if (job === undefined) {
        return ok(undefined);
      }
      const session = sessions.get(job.raceSessionId);
      if (session !== undefined) {
        sessions.set(job.raceSessionId, {
          ...session,
          status: 'failed',
          error: `${code}: ${message}`,
          updatedAt: new Date(),
        });
      }
      jobs.set(jobId, { ...job, status: 'failed', error: `${code}: ${message}`, updatedAt: new Date() });
      return ok(undefined);
    },
  };
};
