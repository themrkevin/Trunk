import { z } from 'zod';

export type TrunkConfig = {
  readonly port: number;
  readonly host: string;
  readonly geminiApiKey: string;
  readonly geminiModel: string;
  readonly credentialLifetimeMinutes: number;
  readonly newSessionLifetimeMinutes: number;
  readonly authenticationRequired: boolean;
  readonly localAuthToken?: string;
};

const requiredString = (name: string): z.ZodString =>
  z.string().trim().min(1, `${name} must not be empty`);

const positiveInteger = (name: string, fallback: number) =>
  z.coerce.number().int(`${name} must be an integer`).positive(`${name} must be positive`).default(fallback);

const booleanFlag = (fallback: boolean) =>
  z.enum(['true', 'false']).default(String(fallback) as 'true' | 'false').transform((value) => value === 'true');

const environmentSchema = z.object({
  PORT: positiveInteger('PORT', 3000),
  HOST: requiredString('HOST').default('127.0.0.1'),
  GEMINI_API_KEY: requiredString('GEMINI_API_KEY'),
  GEMINI_LIVE_MODEL: requiredString('GEMINI_LIVE_MODEL').default('gemini-3.1-flash-live-preview'),
  GEMINI_CREDENTIAL_LIFETIME_MINUTES: positiveInteger('GEMINI_CREDENTIAL_LIFETIME_MINUTES', 30),
  GEMINI_NEW_SESSION_LIFETIME_MINUTES: positiveInteger('GEMINI_NEW_SESSION_LIFETIME_MINUTES', 1),
  TRUNK_AUTH_REQUIRED: booleanFlag(false),
  TRUNK_LOCAL_AUTH_TOKEN: requiredString('TRUNK_LOCAL_AUTH_TOKEN').optional(),
}).superRefine((environment, context) => {
  if (environment.TRUNK_AUTH_REQUIRED && environment.TRUNK_LOCAL_AUTH_TOKEN === undefined) {
    context.addIssue({
      code: 'custom',
      path: ['TRUNK_LOCAL_AUTH_TOKEN'],
      message: 'TRUNK_LOCAL_AUTH_TOKEN is required when TRUNK_AUTH_REQUIRED is true',
    });
  }
});

export const loadConfig = (environment: NodeJS.ProcessEnv = process.env): TrunkConfig => {
  const parsed = environmentSchema.parse(environment);

  return {
    port: parsed.PORT,
    host: parsed.HOST,
    geminiApiKey: parsed.GEMINI_API_KEY,
    geminiModel: parsed.GEMINI_LIVE_MODEL,
    credentialLifetimeMinutes: parsed.GEMINI_CREDENTIAL_LIFETIME_MINUTES,
    newSessionLifetimeMinutes: parsed.GEMINI_NEW_SESSION_LIFETIME_MINUTES,
    authenticationRequired: parsed.TRUNK_AUTH_REQUIRED,
    localAuthToken: parsed.TRUNK_LOCAL_AUTH_TOKEN,
  };
};