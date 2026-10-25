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
  readonly databaseUrl?: string;
  readonly redisUrl?: string;
  readonly s3: {
    readonly endpoint?: string;
    readonly region: string;
    readonly bucket: string;
    readonly accessKey: string;
    readonly secretKey: string;
  };
};

/**
 * Deep-partial input shape: every field optional, nested objects partial.
 * Config files provide this; env vars override individual fields.
 */
export type TrunkConfigInput = {
  readonly port?: number;
  readonly host?: string;
  readonly geminiApiKey?: string;
  readonly geminiModel?: string;
  readonly credentialLifetimeMinutes?: number;
  readonly newSessionLifetimeMinutes?: number;
  readonly authenticationRequired?: boolean;
  readonly localAuthToken?: string;
  readonly databaseUrl?: string;
  readonly redisUrl?: string;
  readonly s3?: {
    readonly endpoint?: string;
    readonly region?: string;
    readonly bucket?: string;
    readonly accessKey?: string;
    readonly secretKey?: string;
  };
};

const requiredString = (name: string): z.ZodString =>
  z.string().trim().min(1, `${name} must not be empty`);

const positiveInteger = (name: string, fallback: number) =>
  z.coerce.number().int(`${name} must be an integer`).positive(`${name} must be positive`).default(fallback);

const s3Schema = z.object({
  endpoint: requiredString('s3.endpoint').optional(),
    region: requiredString('s3.region').default('us-east-2'),
    bucket: requiredString('s3.bucket').default('trunk-s3-dev-487694860761-us-east-2-an'),
  accessKey: z.string().default(''),
  secretKey: z.string().default(''),
});

/**
 * Single validation gate. Validates the merged config-file + env input —
 * the zod schema is the one source of truth for the final shape.
 */
const configSchema = z.object({
  port: positiveInteger('port', 3000),
  host: requiredString('host').default('127.0.0.1'),
  geminiApiKey: requiredString('geminiApiKey'),
  geminiModel: requiredString('geminiModel').default('gemini-3.1-flash-live-preview'),
  credentialLifetimeMinutes: positiveInteger('credentialLifetimeMinutes', 30),
  newSessionLifetimeMinutes: positiveInteger('newSessionLifetimeMinutes', 1),
  authenticationRequired: z.boolean().default(false),
  localAuthToken: requiredString('localAuthToken').optional(),
  databaseUrl: requiredString('databaseUrl').optional(),
  redisUrl: requiredString('redisUrl').optional(),
  s3: s3Schema.default(() => ({ region: 'us-east-2', bucket: 'trunk-s3-dev-487694860761-us-east-2-an', accessKey: '', secretKey: '' })),
}).superRefine((config, context) => {
  if (config.authenticationRequired && config.localAuthToken === undefined) {
    context.addIssue({
      code: 'custom',
      path: ['localAuthToken'],
      message: 'localAuthToken is required when authenticationRequired is true',
    });
  }
});

/**
 * Maps process env vars onto the input shape. Only keys that are present
 * (non-empty) participate — unset env vars never override config files.
 */
const inputFromEnvironment = (environment: NodeJS.ProcessEnv): TrunkConfigInput => {
  const input: Record<string, unknown> = {};

  if (environment.PORT !== undefined) input.port = environment.PORT;
  if (environment.HOST !== undefined && environment.HOST !== '') input.host = environment.HOST;
  if (environment.GEMINI_API_KEY !== undefined) input.geminiApiKey = environment.GEMINI_API_KEY;
  if (environment.GEMINI_LIVE_MODEL) input.geminiModel = environment.GEMINI_LIVE_MODEL;
  if (environment.GEMINI_CREDENTIAL_LIFETIME_MINUTES !== undefined) {
    input.credentialLifetimeMinutes = environment.GEMINI_CREDENTIAL_LIFETIME_MINUTES;
  }
  if (environment.GEMINI_NEW_SESSION_LIFETIME_MINUTES !== undefined) {
    input.newSessionLifetimeMinutes = environment.GEMINI_NEW_SESSION_LIFETIME_MINUTES;
  }
  if (environment.AUTH_REQUIRED !== undefined) {
    input.authenticationRequired = environment.AUTH_REQUIRED === 'true';
  }
  if (environment.LOCAL_AUTH_TOKEN) input.localAuthToken = environment.LOCAL_AUTH_TOKEN;
  if (environment.DATABASE_URL) input.databaseUrl = environment.DATABASE_URL;
  if (environment.REDIS_URL) input.redisUrl = environment.REDIS_URL;

  const s3: Record<string, string> = {};
  if (environment.S3_ENDPOINT) s3.endpoint = environment.S3_ENDPOINT;
  if (environment.S3_REGION) s3.region = environment.S3_REGION;
  if (environment.S3_BUCKET) s3.bucket = environment.S3_BUCKET;
  if (environment.S3_ACCESS_KEY) s3.accessKey = environment.S3_ACCESS_KEY;
  if (environment.S3_SECRET) s3.secretKey = environment.S3_SECRET;
  if (Object.keys(s3).length > 0) input.s3 = s3;

  return input as TrunkConfigInput;
};

/** Shallow merge with one nested level (s3). Env wins over file. */
const mergeInput = (file: TrunkConfigInput, env: TrunkConfigInput): TrunkConfigInput => ({
  ...file,
  ...env,
  s3: { ...file.s3, ...env.s3 },
});

/**
 * Loads configuration with precedence: env vars > config file > schema defaults.
 * Secrets (GEMINI_API_KEY, production credentials) are only ever env-supplied.
 */
export const loadConfig = (
  environment: NodeJS.ProcessEnv = process.env,
  fileDefaults: TrunkConfigInput = {},
): TrunkConfig => {
  const merged = mergeInput(fileDefaults, inputFromEnvironment(environment));
  const parsed = configSchema.parse(merged);

  return {
    port: parsed.port,
    host: parsed.host,
    geminiApiKey: parsed.geminiApiKey,
    geminiModel: parsed.geminiModel,
    credentialLifetimeMinutes: parsed.credentialLifetimeMinutes,
    newSessionLifetimeMinutes: parsed.newSessionLifetimeMinutes,
    authenticationRequired: parsed.authenticationRequired,
    localAuthToken: parsed.localAuthToken,
    databaseUrl: parsed.databaseUrl,
    redisUrl: parsed.redisUrl,
    s3: {
      endpoint: parsed.s3.endpoint,
      region: parsed.s3.region,
      bucket: parsed.s3.bucket,
      accessKey: parsed.s3.accessKey,
      secretKey: parsed.s3.secretKey,
    },
  };
};