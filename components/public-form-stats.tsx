'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Period = '7d' | '30d' | 'all'

interface CenterOption {
  id: string
  name: string
}

interface StatsRow {
  centerId: string
  centerName: string
  visits: number
  submissions: number
  conversionRate: number | null
}

interface StatsData {
  period: Period
  periodStart: string | null
  generatedAt: string
  centers: CenterOption[]
  rows: StatsRow[]
  totals: {
    visits: number
    submissions: number
    conversionRate: number | null
  }
}

function formatPercentage(value: number | null) {
  if (value === null) return '–'
  return `${new Intl.NumberFormat('da-DK', { maximumFractionDigits: 1 }).format(value)} %`
}

function formatDanishDateTime(value: string) {
  return new Intl.DateTimeFormat('da-DK', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Copenhagen',
  }).format(new Date(value))
}

export function PublicFormStats() {
  const [period, setPeriod] = useState<Period>('30d')
  const [centerId, setCenterId] = useState('all')
  const [data, setData] = useState<StatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCurrent = true

    async function loadStats() {
      setIsLoading(true)
      setError(null)

      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Din session er udløbet. Log ind igen.')

        const searchParams = new URLSearchParams({ period })
        if (centerId !== 'all') searchParams.set('centerId', centerId)

        const response = await fetch(`/api/admin/public-form-stats?${searchParams}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        })
        const result = await response.json()

        if (!response.ok) throw new Error(result.error ?? 'Kunne ikke indlæse besøgsstatistik')
        if (isCurrent) setData(result)
      } catch (loadError) {
        if (isCurrent) {
          setError(loadError instanceof Error ? loadError.message : 'Kunne ikke indlæse besøgsstatistik')
        }
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    void loadStats()

    return () => {
      isCurrent = false
    }
  }, [period, centerId])

  const periodText = data?.periodStart
    ? `Fra ${formatDanishDateTime(data.periodStart)}`
    : 'Hele perioden'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Besøg på fejlmeldingssiden</CardTitle>
        <CardDescription>
          Et besøg registreres, når den offentlige fejlmeldingsside åbnes. Besøget kan komme fra en QR-kode eller et direkte link.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Select value={period} onValueChange={(value) => setPeriod(value as Period)}>
            <SelectTrigger className="w-full sm:w-[200px]" aria-label="Vælg periode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Seneste 7 dage</SelectItem>
              <SelectItem value="30d">Seneste 30 dage</SelectItem>
              <SelectItem value="all">Hele perioden</SelectItem>
            </SelectContent>
          </Select>

          <Select value={centerId} onValueChange={setCenterId}>
            <SelectTrigger className="w-full sm:w-[240px]" aria-label="Vælg center">
              <SelectValue placeholder="Alle centre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle centre</SelectItem>
              {(data?.centers ?? []).map((center) => (
                <SelectItem key={center.id} value={center.id}>{center.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="py-8 text-center text-muted-foreground">Indlæser statistik...</p>
        ) : error ? (
          <p className="py-8 text-center text-red-600" role="alert">{error}</p>
        ) : data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Besøg</p>
                <p className="mt-1 text-3xl font-bold">{data.totals.visits}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Offentlige fejlmeldinger</p>
                <p className="mt-1 text-3xl font-bold">{data.totals.submissions}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Konverteringsgrad</p>
                <p className="mt-1 text-3xl font-bold">{formatPercentage(data.totals.conversionRate)}</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Center</th>
                    <th className="px-4 py-3 text-right font-medium">Besøg</th>
                    <th className="px-4 py-3 text-right font-medium">Fejlmeldinger</th>
                    <th className="px-4 py-3 text-right font-medium">Konvertering</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.centerId} className="border-t">
                      <td className="px-4 py-3 font-medium">{row.centerName}</td>
                      <td className="px-4 py-3 text-right">{row.visits}</td>
                      <td className="px-4 py-3 text-right">{row.submissions}</td>
                      <td className="px-4 py-3 text-right">{formatPercentage(row.conversionRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground">
              {periodText} · Opdateret {formatDanishDateTime(data.generatedAt)}
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
