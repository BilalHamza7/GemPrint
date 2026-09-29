import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import { env } from './config/env.js'
import { healthRouter } from './routes/health.js'
import { authRouter } from './routes/auth.js'

export const app = express()
app.disable('x-powered-by')
app.use(helmet())
app.use(cors({ origin: env.FRONTEND_URL, methods: ['GET', 'POST'], credentials: true }))
app.use(express.json({ limit: '12mb' }))
app.use(pinoHttp())
app.use('/health', healthRouter)
app.use('/api/auth', authRouter)
app.use((_request, response) => response.status(404).json({ error: 'Route not found' }))
