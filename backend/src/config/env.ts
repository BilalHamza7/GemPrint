import 'dotenv/config'

function normalizeSupabaseProjectUrl(value: string | undefined) {
  if (!value) return undefined
  return value
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '')
}

const port = Number(process.env.PORT ?? 4000)
if (!Number.isInteger(port) || port <= 0) throw new Error('PORT must be a positive integer.')
export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: port,
  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  SUPABASE_URL: normalizeSupabaseProjectUrl(process.env.SUPABASE_URL),
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  CV_SERVICE_URL: process.env.CV_SERVICE_URL ?? 'http://localhost:8000',
  CV_INTERNAL_SERVICE_KEY: process.env.CV_INTERNAL_SERVICE_KEY ?? 'development-only-change-me',
  JWT_SECRET: process.env.JWT_SECRET,
}
export const supabaseConfigured = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)
