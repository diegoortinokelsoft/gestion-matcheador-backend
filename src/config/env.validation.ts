import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  SUPABASE_JWT_SECRET: z.string().min(1).optional(),
  SUPABASE_RESET_PASSWORD_REDIRECT_URL: z.string().url().optional(),
  ALLOWED_ORIGINS: z
    .string()
    .min(1)
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),

  APPSCRIPT_BASE_URL: z.string().url(),
  APPSCRIPT_INTERNAL_TOKEN: z.string().min(20),
  APPSCRIPT_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),

  RATE_LIMIT_AUTH_LOGIN_PER_IP: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_AUTH_LOGIN_PER_EMAIL: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_AUTH_LOGIN_WINDOW_SECONDS: z.coerce.number().int().positive().default(900),

  RATE_LIMIT_AUTH_RECOVERY_PER_IP: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_AUTH_RECOVERY_PER_EMAIL: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_AUTH_RECOVERY_WINDOW_SECONDS: z.coerce.number().int().positive().default(3600),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  const parsed = envSchema.safeParse(config);
  if (parsed.success) return parsed.data;

  const flattened = parsed.error.flatten();
  const fieldErrors = Object.entries(flattened.fieldErrors)
    .map(([key, errors]) => `${key}: ${errors?.join(', ')}`)
    .join('\n');
  const formErrors = flattened.formErrors.join('\n');
  const message = [fieldErrors, formErrors].filter(Boolean).join('\n');

  throw new Error(`Invalid environment variables:\n${message}`);
}
