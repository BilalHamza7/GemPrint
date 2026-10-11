import { Router } from 'express'
import { supabaseConfigured } from '../config/env.js'

export const healthRouter = Router()
healthRouter.get('/', (_request, response) =>
  response.status(200).json({
    status: 'ok',
    service: 'gemprint-api',
    supabaseConfigured,
    cvContract: 'framed-roi-v2',
    revision: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? 'local',
  }),
)
