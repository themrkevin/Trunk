import type { FastifyPluginAsync } from 'fastify';
import type { Authenticator } from '#core/auth';
import type { IssueRealtimeCredentialService } from './service.js';

export type RealtimeCredentialsPluginOptions = {
  readonly authenticator: Authenticator;
  readonly service: IssueRealtimeCredentialService;
};

export const realtimeCredentialsPlugin: FastifyPluginAsync<RealtimeCredentialsPluginOptions> = async (fastify, options): Promise<void> => {
  fastify.post('/v1/realtime/credentials', async (request, reply) => {
    const authentication = options.authenticator.authenticate(request.headers.authorization);
    if (!authentication.ok) {
      return reply.code(401).send({ ok: false, error: authentication.error });
    }

    const result = await options.service.issue(authentication.data);
    if (!result.ok) {
      return reply.code(502).send({ ok: false, error: result.error });
    }

    return reply.code(200).send({
      ok: true,
      data: {
        credential: result.data.value,
        expiresAt: result.data.expiresAt,
        newSessionExpiresAt: result.data.newSessionExpiresAt,
        sessionScope: result.data.sessionScope,
      },
    });
  });
};