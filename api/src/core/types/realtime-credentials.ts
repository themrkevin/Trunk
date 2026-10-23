import type { Result } from '#core/types/result';

export type RealtimeCredentialErrorCode =
  | 'PROVIDER_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export type RealtimeCredentialError = {
  readonly code: RealtimeCredentialErrorCode;
  readonly message: string;
};

export type RealtimeCredentialRequest = Record<string, never>;

export type RealtimeCredential = {
  readonly value: string;
  readonly expiresAt: string;
  readonly newSessionExpiresAt: string;
  readonly sessionScope: 'realtime-voice';
};

export interface RealtimeCredentialProvider {
  createCredential(): Promise<Result<RealtimeCredential, RealtimeCredentialError>>;
}