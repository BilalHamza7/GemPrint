import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  CV_SERVICE_URL: z.string().url().default('http://localhost:8000'),
  CV_INTERNAL_SERVICE_KEY: z.string().min(16).default('development-only-change-me'),
})

export const env = schema.parse(process.env)
