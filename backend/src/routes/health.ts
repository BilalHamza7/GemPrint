import { Router } from 'express'
import { supabaseConfigured } from '../config/env.js'

export const healthRouter = Router()
healthRouter.get('/', (_request, response) =>
  response.status(200).json({ status: 'ok', service: 'gemprint-api', supabaseConfigured }),
)
