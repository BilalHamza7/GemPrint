import { Router } from 'express'
import { getSupabaseAdminClient } from '../config/supabase.js'
import { requireAuth } from '../middleware/require-auth.js'

export const reportsRouter = Router()
reportsRouter.use(requireAuth)
reportsRouter.get('/', async (request, response) => {
  try { const { data, error } = await getSupabaseAdminClient().from('gemstone_reports').select('*').eq('user_id', request.user!.id).order('created_at', { ascending: false }); return error ? response.status(500).json({ error: error.message }) : response.json({ reports: data }) } catch { return response.status(503).json({ error: 'Database is not configured.' }) }
})
reportsRouter.get('/:id', async (request, response) => {
  try { const { data, error } = await getSupabaseAdminClient().from('gemstone_reports').select('*, fingerprint_data(*), verification_logs(*)').eq('id', request.params.id).eq('user_id', request.user!.id).single(); return error ? response.status(404).json({ error: 'Report not found.' }) : response.json({ report: data }) } catch { return response.status(503).json({ error: 'Database is not configured.' }) }
})
reportsRouter.post('/', async (request, response) => {
  const b = request.body as Record<string, unknown>
  if (!b.serialNumber || !b.issueDate || !b.species || !b.variety || typeof b.caratWeight !== 'number' || b.caratWeight <= 0) return response.status(400).json({ error: 'Missing or invalid report fields.' })
  try { const { data, error } = await getSupabaseAdminClient().from('gemstone_reports').insert({ user_id: request.user!.id, serial_number: b.serialNumber, issue_date: b.issueDate, species: b.species, variety: b.variety, carat_weight: b.caratWeight, colour: b.colour ?? '', cut_shape: b.cutShape ?? '', dimensions: b.dimensions ?? '', comments: b.comments ?? null }).select().single(); return error ? response.status(400).json({ error: error.message }) : response.status(201).json({ report: data }) } catch { return response.status(503).json({ error: 'Database is not configured.' }) }
})
