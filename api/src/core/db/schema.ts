import { index, integer, jsonb, pgEnum, pgTable, real, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/**
 * Evidence payload shapes — schemaVersion 1 mirrors the Swift TelemetryKit
 * contract exactly (CornerEvidence, RecordedSessionInspection). Field names
 * match Swift Codable output; the Go worker must serialize identically.
 * See docs/plan/evidence-system-plan.md "Server Schema".
 */

export type TelemetryRangeJson = {
  readonly minimum: number | null;
  readonly maximum: number | null;
};

export type DerivedTelemetryEventJson = {
  readonly packetIndex: number;
  readonly elapsedTime: number;
  readonly lapElapsedTime: number | null;
  readonly lapNumber: number;
  readonly phase: 'loading' | 'preSession' | 'paused' | 'driving';
  readonly valueG: number;
  readonly speedMetersPerSecond: number;
  readonly yawRateRadiansPerSecond: number;
};

export type SessionConditionsJson = {
  readonly tireSurfaceTempC: TelemetryRangeJson;
  readonly suspensionTravel: TelemetryRangeJson;
  readonly surfaceTypes: readonly string[];
  readonly waterTempC: TelemetryRangeJson;
};

export type SessionStatsJson = {
  readonly speed: TelemetryRangeJson;
  readonly peakAccelerationEvent: DerivedTelemetryEventJson | null;
  readonly peakLateralCentripetalEvent: DerivedTelemetryEventJson | null;
  readonly invalidPacketCount: number;
  readonly sequenceGapCount: number;
};

export type CornerEvidenceDomainTagsJson = {
  readonly rideControl: 'ready' | 'caution' | 'unavailable';
  readonly platformContact: 'ready' | 'caution' | 'unavailable';
  readonly gripUtilization: 'ready' | 'caution' | 'unavailable';
  readonly suspensionBehavior: 'ready' | 'caution' | 'unavailable';
  readonly aeroInfluence: 'ready' | 'caution' | 'unavailable';
};

export type CornerEvidenceJson = {
  readonly cornerIndex: number;
  readonly lapNumber: number;
  readonly anchorLapTimeSeconds: number | null;
  readonly anchorSessionTimeSeconds: number;
  readonly entryLapTimeSeconds: number | null;
  readonly entrySessionTimeSeconds: number;
  readonly minimumSpeedLapTimeSeconds: number | null;
  readonly minimumSpeedSessionTimeSeconds: number;
  readonly exitLapTimeSeconds: number | null;
  readonly exitSessionTimeSeconds: number;
  readonly throttlePickupLapTimeSeconds: number | null;
  readonly throttlePickupSessionTimeSeconds: number | null;
  readonly entrySpeedMetersPerSecond: number;
  readonly minimumSpeedMetersPerSecond: number;
  readonly exitSpeedMetersPerSecond: number;
  readonly speedRecoveryMetersPerSecond: number;
  readonly peakLateralCentripetalG: number;
  readonly entryGear: number;
  readonly minimumSpeedGear: number;
  readonly exitGear: number;
  readonly entryBrake: number;
  readonly exitThrottle: number;
  readonly throttlePickupDelaySeconds: number | null;
  readonly exitAccelerationEstimateMetersPerSecondSquared: number;
  readonly isPossibleCorner: boolean;
  readonly evidenceConfidence: number;
  readonly domainTags: CornerEvidenceDomainTagsJson;
  readonly dataWarnings: readonly string[];
};

export const raceSessionStatusEnum = pgEnum('race_session_status', ['processing', 'completed', 'failed']);
export const extractionJobStatusEnum = pgEnum('extraction_job_status', ['pending', 'processing', 'completed', 'failed']);

/**
 * race_sessions — one row per (user, content) pair. contentHash alone is not
 * unique; dedup is scoped per user via the composite unique index.
 */
export const raceSessions = pgTable(
  'race_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    contentHash: text('content_hash').notNull(),
    blobKey: text('blob_key').notNull(),
    status: raceSessionStatusEnum('status').notNull().default('processing'),

    // Metadata (from header + inspection)
    fileSizeBytes: integer('file_size_bytes'),
    frameCount: integer('frame_count'),
    sampleRateHz: integer('sample_rate_hz'),
    durationSeconds: real('duration_seconds'),
    carCode: integer('car_code'),
    lapFirst: integer('lap_first'),
    lapLast: integer('lap_last'),
    phases: jsonb('phases').$type<readonly string[]>(),

    // Extracted payloads (null until completed)
    conditions: jsonb('conditions').$type<SessionConditionsJson>(),
    stats: jsonb('stats').$type<SessionStatsJson>(),
    evidence: jsonb('evidence').$type<readonly CornerEvidenceJson[]>(),

    schemaVersion: integer('schema_version').notNull().default(1),
    error: text('error'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    extractedAt: timestamp('extracted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('race_sessions_user_content_unique').on(table.userId, table.contentHash),
    index('race_sessions_user_id_idx').on(table.userId),
  ],
);

/**
 * extraction_jobs — one row per extraction attempt. streamEntryId records the
 * Redis Stream entry for correlation. Latest job per content wins status-wise;
 * the service enforces single in-flight job per (userId, contentHash).
 */
export const extractionJobs = pgTable(
  'extraction_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    raceSessionId: uuid('race_session_id').notNull().references(() => raceSessions.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    contentHash: text('content_hash').notNull(),
    status: extractionJobStatusEnum('status').notNull().default('pending'),
    streamEntryId: text('stream_entry_id'),
    attempts: integer('attempts').notNull().default(0),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('extraction_jobs_session_idx').on(table.raceSessionId),
    index('extraction_jobs_user_content_idx').on(table.userId, table.contentHash),
  ],
);
