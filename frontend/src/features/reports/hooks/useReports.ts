import { useCallback, useEffect, useState } from 'react'
import { listReports } from '../api/reportsApi'
import type { GemstoneReport } from '../types/report'

export function useReports() {
  const [reports, setReports] = useState<GemstoneReport[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const reload = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      setReports(await listReports())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The report registry could not be loaded.')
    } finally {
      setIsLoading(false)
    }
  }, [])
  useEffect(() => {
    void reload()
  }, [reload])
  return { reports, error, isLoading, reload }
}
