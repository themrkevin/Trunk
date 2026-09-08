import { describe, expect, it } from 'vitest';
import type { Authenticator } from '#core/auth';
import type { TrunkConfig } from '#core/config';
import type { RealtimeCredentialProvider } from '#core/types/realtime-credentials';
import { buildApp } from '#app';

const config: TrunkConfig = {
  port: 3000,
  host: '127.0.0.1',
  geminiApiKey: 'test-only-key',
  geminiModel: 'test-model',
  credentialLifetimeMinutes: 30,
  newSessionLifetimeMinutes: 1,
  authenticationRequired: false,
};

const successfulProvider = (calls: { count: number }): RealtimeCredentialProvider => ({
  async createCredential() {
    calls.count += 1;
    return {
      ok: true,
      data: {
        value: 'test-credential',
        expiresAt: '2030-01-01T00:30:00.000Z',
        newSessionExpiresAt: '2030-01-01T00:01:00.000Z',
        sessionScope: 'realtime-voice',
      },
    };
  },
});

const failingProvider = (calls: { count: number }): RealtimeCredentialProvider => ({
  async createCredential() {
    calls.count += 1;
    return {
      ok: false,
      error: {
        code: 'PROVIDER_UNAVAILABLE' as const,
        message: 'Gemini could not provision an ephemeral token.',
      },
    };
  },
});

const rejectingAuthenticator: Authenticator = {
  authenticate() {
    return {
      ok: false,
      error: {
        code: 'UNAUTHENTICATED' as const,
        message: 'Authentication is required.',
      },
    };
  },
};

describe('realtime credentials plugin', () => {
  it('issues a realtime credential successfully', async () => {
    const calls = { count: 0 };
    const app = buildApp(config, { provider: successfulProvider(calls) });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/realtime/credentials',
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        ok: true,
        data: {
          credential: 'test-credential',
          expiresAt: '2030-01-01T00:30:00.000Z',
          newSessionExpiresAt: '2030-01-01T00:01:00.000Z',
          sessionScope: 'realtime-voice',
        },
      });
      expect(calls.count).toBe(1);
    } finally {
      await app.close();
    }
  });

  it('maps provider failures to a 502 response', async () => {
    const calls = { count: 0 };
    const app = buildApp(config, { provider: failingProvider(calls) });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/realtime/credentials',
        payload: {},
      });

      expect(response.statusCode).toBe(502);
      expect(response.json()).toEqual({
        ok: false,
        error: {
          code: 'PROVIDER_UNAVAILABLE',
          message: 'Gemini could not provision an ephemeral token.',
        },
      });
      expect(calls.count).toBe(1);
    } finally {
      await app.close();
    }
  });

  it('does not call the provider when authentication fails', async () => {
    const calls = { count: 0 };
    const app = buildApp(config, {
      authenticator: rejectingAuthenticator,
      provider: successfulProvider(calls),
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/realtime/credentials',
        payload: {},
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        ok: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication is required.',
        },
      });
      expect(calls.count).toBe(0);
    } finally {
      await app.close();
    }
  });
});