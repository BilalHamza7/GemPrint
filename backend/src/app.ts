import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import { env } from './config/env.js'
import { healthRouter } from './routes/health.js'
import { authRouter } from './routes/auth.js'
import { reportsRouter } from './routes/reports.js'

type UploadError = Error & { code?: string }

export const app = express()
app.disable('x-powered-by')
app.use(helmet())

function normalizeOrigin(origin: string) {
  return origin.trim().replace(/\/+$/, '')
}

// The production frontend remains explicitly configured through FRONTEND_URL.
// Extra trusted origins are deliberately opt-in so local development does not
// weaken the deployed API's CORS policy.
const allowedOrigins = new Set(
  [env.FRONTEND_URL, ...env.ADDITIONAL_ALLOWED_ORIGINS.split(',')].map(normalizeOrigin).filter(Boolean),
)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(normalizeOrigin(origin))) return callback(null, true)
      return callback(new Error('Origin is not allowed by CORS.'))
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  }),
)
app.use(express.json({ limit: '12mb' }))
app.use(pinoHttp())
app.use('/health', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/reports', reportsRouter)
app.use((error: UploadError, _request: express.Request, response: express.Response, next: express.NextFunction) => {
  if (error.code === 'LIMIT_FILE_SIZE')
    return response.status(413).json({ error: 'Image exceeds the 50 MB upload limit.' })
  if (error.message === 'Unexpected field')
    return response.status(400).json({ error: 'Use the image form field for uploads.' })
  return next(error)
})
app.use((_request, response) => response.status(404).json({ error: 'Route not found' }))
