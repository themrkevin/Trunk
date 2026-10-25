import { describe, expect, it } from 'vitest';
import { loadConfig } from '#core/config';

const baseEnvironment = {
  GEMINI_API_KEY: ' test-key ',
};

describe('configuration', () => {
  it('loads defaults and trims string configuration', () => {
    expect(loadConfig(baseEnvironment)).toEqual({
    port: 3000,
    host: '127.0.0.1',
    geminiApiKey: 'test-key',
    geminiModel: 'gemini-3.1-flash-live-preview',
    credentialLifetimeMinutes: 30,
    newSessionLifetimeMinutes: 1,
    authenticationRequired: false,
    localAuthToken: undefined,
    databaseUrl: undefined,
    redisUrl: undefined,
    s3: {
      endpoint: undefined,
      region: 'us-east-2',
      bucket: 'trunk-s3-dev-487694860761-us-east-2-an',
      accessKey: '',
      secretKey: '',
    },
  });
  });

  it('coerces positive integer environment values', () => {
    const config = loadConfig({
      ...baseEnvironment,
      PORT: '4000',
      GEMINI_CREDENTIAL_LIFETIME_MINUTES: '45',
      GEMINI_NEW_SESSION_LIFETIME_MINUTES: '2',
    });

    expect(config.port).toBe(4000);
    expect(config.credentialLifetimeMinutes).toBe(45);
    expect(config.newSessionLifetimeMinutes).toBe(2);
  });

  it('requires a local auth token when authentication is enabled', () => {
    expect(() => loadConfig({ ...baseEnvironment, AUTH_REQUIRED: 'true' })).toThrow(
      /localAuthToken is required when authenticationRequired is true/,
    );
  });

  it('rejects invalid configuration values', () => {
    expect(() => loadConfig({ ...baseEnvironment, PORT: 'not-a-number' })).toThrow(
      /expected number, received/,
    );
  });

  it('loads optional infrastructure configuration when present', () => {
    const config = loadConfig({
      ...baseEnvironment,
      DATABASE_URL: 'postgres://localhost:5432/trunk',
      REDIS_URL: 'redis://localhost:6379',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_BUCKET: 'my-bucket',
      S3_ACCESS_KEY: 'key',
      S3_SECRET: 'secret',
    });

    expect(config.databaseUrl).toBe('postgres://localhost:5432/trunk');
    expect(config.redisUrl).toBe('redis://localhost:6379');
    expect(config.s3).toEqual({
      endpoint: 'http://localhost:9000',
      region: 'us-east-2',
      bucket: 'my-bucket',
      accessKey: 'key',
      secretKey: 'secret',
    });
  });

  it('merges config file defaults beneath env vars', () => {
    const fileDefaults = {
      databaseUrl: 'postgres://from-file:5432/trunk',
      redisUrl: 'redis://from-file:6379',
      geminiModel: 'file-model',
      s3: { endpoint: 'http://file:9000', accessKey: 'file-key' },
    };

    const config = loadConfig(
      { ...baseEnvironment, REDIS_URL: 'redis://from-env:6379', S3_ACCESS_KEY: 'env-key' },
      fileDefaults,
    );

    // env wins where set
    expect(config.redisUrl).toBe('redis://from-env:6379');
    expect(config.s3.accessKey).toBe('env-key');
    // file fills the rest
    expect(config.databaseUrl).toBe('postgres://from-file:5432/trunk');
    expect(config.geminiModel).toBe('file-model');
    expect(config.s3.endpoint).toBe('http://file:9000');
    // schema defaults still apply underneath
    expect(config.s3.region).toBe('us-east-2');
    expect(config.port).toBe(3000);
  });

  it('ignores empty-string env vars so they cannot override file defaults', () => {
    const config = loadConfig(
      { ...baseEnvironment, DATABASE_URL: '', S3_ENDPOINT: '' },
      { databaseUrl: 'postgres://from-file:5432/trunk', s3: { endpoint: 'http://file:9000' } },
    );

    expect(config.databaseUrl).toBe('postgres://from-file:5432/trunk');
    expect(config.s3.endpoint).toBe('http://file:9000');
  });
});