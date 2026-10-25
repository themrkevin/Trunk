import type { TrunkConfigInput } from '../src/core/config.js';

/**
 * Development configuration — non-secret defaults for local work.
 *
 * Precedence: env vars > this file > schema defaults.
 * Secrets (GEMINI_API_KEY, S3 credentials, production credentials) NEVER
 * live here — they come from your secret store (macOS Keychain) via env vars.
 *
 * databaseUrl/redisUrl point at the docker-compose local infra
 * (postgres + redis). Blob storage is real AWS S3 (free tier) — set
 * S3_BUCKET / S3_ACCESS_KEY / S3_SECRET via env from your keychain.
 */
const development: TrunkConfigInput = {
  port: 3000,
  host: '127.0.0.1',
  geminiModel: 'gemini-3.1-flash-live-preview',
  credentialLifetimeMinutes: 30,
  newSessionLifetimeMinutes: 1,
  authenticationRequired: false,
  databaseUrl: 'postgres://trunk:trunk-dev-password@localhost:5432/trunk',
  redisUrl: 'redis://localhost:6379',
  s3: {
    region: 'us-east-2',
    bucket: 'trunk-s3-dev-487694860761-us-east-2-an',
    // endpoint intentionally unset → AWS SDK targets real S3
    // accessKey/secretKey intentionally empty → supplied via env from keychain
  },
};

export default development;
