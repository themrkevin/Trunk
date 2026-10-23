import { GoogleGenAI, Modality } from '@google/genai';
import { err, ok, type Result } from '#core/types/result';
import type { RealtimeCredential, RealtimeCredentialError, RealtimeCredentialProvider } from '#core/types/realtime-credentials';

export type GoogleGenAIProviderOptions = {
  readonly apiKey: string;
  readonly model: string;
  readonly credentialLifetimeMinutes: number;
  readonly newSessionLifetimeMinutes: number;
  readonly now?: () => Date;
};

const providerError = (message: string): Result<RealtimeCredential, RealtimeCredentialError> =>
  err({ code: 'PROVIDER_UNAVAILABLE', message });

export const createGoogleGenAIProvider = (
  options: GoogleGenAIProviderOptions,
): RealtimeCredentialProvider => {
  const client = new GoogleGenAI({ apiKey: options.apiKey });
  const now = options.now ?? (() => new Date());

  return {
    async createCredential(): Promise<Result<RealtimeCredential, RealtimeCredentialError>> {
      const currentTime = now();
      const expireTime = new Date(currentTime.getTime() + options.credentialLifetimeMinutes * 60_000);
      const newSessionExpireTime = new Date(currentTime.getTime() + options.newSessionLifetimeMinutes * 60_000);

      try {
        const token = await client.authTokens.create({
          config: {
            uses: 1,
            expireTime: expireTime.toISOString(),
            newSessionExpireTime: newSessionExpireTime.toISOString(),
            liveConnectConstraints: {
              model: options.model,
              config: {
                responseModalities: [Modality.AUDIO],
                sessionResumption: {},
              },
            },
          },
        });

        if (typeof token.name !== 'string' || token.name.trim() === '') {
          return providerError('Gemini returned an invalid ephemeral token.');
        }

        return ok({
          value: token.name,
          expiresAt: expireTime.toISOString(),
          newSessionExpiresAt: newSessionExpireTime.toISOString(),
          sessionScope: 'realtime-voice',
        });
      } catch {
        return providerError('Gemini could not provision an ephemeral token.');
      }
    },
  };
};