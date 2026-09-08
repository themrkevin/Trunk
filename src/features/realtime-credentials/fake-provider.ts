import { ok, type Result } from '#core/types/result';
import type { RealtimeCredential, RealtimeCredentialProvider } from '#core/types/realtime-credentials';

export const createFakeRealtimeCredentialProvider = (
  credential = 'local-development-token',
): RealtimeCredentialProvider => ({
  async createCredential(): Promise<Result<RealtimeCredential, never>> {
    return ok({
      value: credential,
      expiresAt: '2099-01-01T00:30:00.000Z',
      newSessionExpiresAt: '2099-01-01T00:01:00.000Z',
      sessionScope: 'realtime-voice',
    });
  },
});