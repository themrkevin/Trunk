import type { AuthenticatedSubject } from '#core/auth';
import type { RealtimeCredential, RealtimeCredentialError, RealtimeCredentialProvider } from '#core/types/realtime-credentials';
import { err, ok, type Result } from '#core/types/result';

export type IssueRealtimeCredentialError = RealtimeCredentialError;

export type IssueRealtimeCredentialService = {
  issue(subject: AuthenticatedSubject): Promise<Result<RealtimeCredential, IssueRealtimeCredentialError>>;
};

export const createIssueRealtimeCredentialService = (
  provider: RealtimeCredentialProvider,
): IssueRealtimeCredentialService => ({
  async issue(_subject: AuthenticatedSubject): Promise<Result<RealtimeCredential, IssueRealtimeCredentialError>> {
    const result = await provider.createCredential();
    return result.ok ? ok(result.data) : err(result.error);
  },
});