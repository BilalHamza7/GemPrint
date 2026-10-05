import { Router } from 'express'
import { requireAuth } from '../middleware/require-auth.js'
import { login, register } from '../controllers/auth-controller.js'

export const authRouter = Router()
authRouter.post('/register', register)
authRouter.post('/login', login)
authRouter.get('/me', requireAuth, (request, response) => response.json({ user: request.user }))
authRouter.post('/logout', requireAuth, (_request, response) => response.status(204).send())
