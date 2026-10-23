import Fastify, { type FastifyInstance } from 'fastify';
import type { Authenticator } from '#core/auth';
import type { TrunkConfig } from '#core/config';
import type { RealtimeCredentialProvider } from '#core/types/realtime-credentials';
import { createGoogleGenAIProvider } from '#features/realtime-credentials/google-gen-ai-provider';
import { realtimeCredentialsPlugin } from '#features/realtime-credentials/plugin';
import { createIssueRealtimeCredentialService } from '#features/realtime-credentials/service';

export type AppDependencies = {
  readonly authenticator?: Authenticator;
  readonly provider?: RealtimeCredentialProvider;
};

const createLocalAuthenticator = (expectedToken: string | undefined, authenticationRequired: boolean): Authenticator => ({
  authenticate(authorizationHeader: string | undefined) {
    if (!authenticationRequired) {
      return { ok: true, data: { id: 'local-development-user' } };
    }

    const expectedHeader = `Bearer ${expectedToken}`;
    return authorizationHeader === expectedHeader
      ? { ok: true, data: { id: 'local-development-user' } }
      : { ok: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' } };
  },
});

export const buildApp = (config: TrunkConfig, dependencies: AppDependencies = {}): FastifyInstance => {
  const app = Fastify({ logger: true });
  const provider = dependencies.provider ?? createGoogleGenAIProvider({
    apiKey: config.geminiApiKey,
    model: config.geminiModel,
    credentialLifetimeMinutes: config.credentialLifetimeMinutes,
    newSessionLifetimeMinutes: config.newSessionLifetimeMinutes,
  });
  const service = createIssueRealtimeCredentialService(provider);
  const authenticator = dependencies.authenticator ?? createLocalAuthenticator(config.localAuthToken, config.authenticationRequired);

  void app.register(realtimeCredentialsPlugin, { authenticator, service });
  return app;
};