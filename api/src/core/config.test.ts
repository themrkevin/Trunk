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
    expect(() => loadConfig({ ...baseEnvironment, TRUNK_AUTH_REQUIRED: 'true' })).toThrow(
      /TRUNK_LOCAL_AUTH_TOKEN is required when TRUNK_AUTH_REQUIRED is true/,
    );
  });

  it('rejects invalid configuration values', () => {
    expect(() => loadConfig({ ...baseEnvironment, PORT: 'not-a-number' })).toThrow(
      /Invalid input: expected number, received NaN/,
    );

    expect(() => loadConfig({ ...baseEnvironment, TRUNK_AUTH_REQUIRED: 'sometimes' })).toThrow(
      /expected one of.*true.*false/,
    );
  });
});