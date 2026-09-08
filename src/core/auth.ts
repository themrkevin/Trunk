import type { Result } from '#core/types/result';

export type AuthenticatedSubject = {
  readonly id: string;
};

export type AuthenticationError = {
  readonly code: 'UNAUTHENTICATED';
  readonly message: string;
};

export interface Authenticator {
  authenticate(authorizationHeader: string | undefined): Result<AuthenticatedSubject, AuthenticationError>;
}