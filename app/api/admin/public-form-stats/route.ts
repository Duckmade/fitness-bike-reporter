import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getConversionRate,
  getPublicStatsPeriodStart,
  type PublicStatsPeriod,
} from '@/lib/public-form-analytics'

export const dynamic = 'force-dynamic'

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase-administration er ikke konfigureret på serveren')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

async function requireAdmin(request: NextRequest) {
  const authorization = request.headers.get('authorization')
  const accessToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : null

  if (!accessToken) {
    return { error: 'Du skal være logget ind', status: 401 } as const
  }

  const supabase = createAdminClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken)

  if (userError || !user) {
    return { error: 'Din session er udløbet. Log ind igen.', status: 401 } as const
  }

  const { data: userRole, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (roleError || userRole?.role !== 'admin') {
    return { error: 'Du har ikke adgang til besøgsstatistik', status: 403 } as const
  }

  return { supabase } as const
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)

    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const periodParam = request.nextUrl.searchParams.get('period') ?? '30d'
    const centerId = request.nextUrl.searchParams.get('centerId') ?? ''

    if (!['7d', '30d', 'all'].includes(periodParam)) {
      return NextResponse.json({ error: 'Ugyldig periode' }, { status: 400 })
    }

    if (centerId && !isUuid(centerId)) {
      return NextResponse.json({ error: 'Ugyldigt center' }, { status: 400 })
    }

    const period = periodParam as PublicStatsPeriod
    const periodStart = getPublicStatsPeriodStart(period)
    const { data: centers, error: centersError } = await auth.supabase
      .from('centers')
      .select('id, name')
      .order('name')

    if (centersError) throw centersError

    const allCenters = centers ?? []
    const selectedCenters = centerId
      ? allCenters.filter((center) => center.id === centerId)
      : allCenters

    if (centerId && selectedCenters.length === 0) {
      return NextResponse.json({ error: 'Centeret blev ikke fundet' }, { status: 404 })
    }

    const rows = await Promise.all(selectedCenters.map(async (center) => {
      let visitsQuery = auth.supabase
        .from('public_form_visits')
        .select('id', { count: 'exact', head: true })
        .eq('center_id', center.id)

      let reportsQuery = auth.supabase
        .from('issue_reports')
        .select('id, bikes!inner(center_id)', { count: 'exact', head: true })
        .eq('origin', 'public_report_page')
        .eq('bikes.center_id', center.id)

      if (periodStart) {
        visitsQuery = visitsQuery.gte('visited_at', periodStart)
        reportsQuery = reportsQuery.gte('created_at', periodStart)
      }

      const [visitsResult, reportsResult] = await Promise.all([visitsQuery, reportsQuery])

      if (visitsResult.error) throw visitsResult.error
      if (reportsResult.error) throw reportsResult.error

      const visits = visitsResult.count ?? 0
      const submissions = reportsResult.count ?? 0

      return {
        centerId: center.id,
        centerName: center.name,
        visits,
        submissions,
        conversionRate: getConversionRate(visits, submissions),
      }
    }))

    const totals = rows.reduce(
      (result, row) => ({
        visits: result.visits + row.visits,
        submissions: result.submissions + row.submissions,
      }),
      { visits: 0, submissions: 0 }
    )

    return NextResponse.json({
      period,
      periodStart,
      generatedAt: new Date().toISOString(),
      centers: allCenters,
      rows,
      totals: {
        ...totals,
        conversionRate: getConversionRate(totals.visits, totals.submissions),
      },
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error loading public form statistics:', error)
    return NextResponse.json(
      { error: 'Kunne ikke indlæse besøgsstatistik' },
      { status: 500 }
    )
  }
}
