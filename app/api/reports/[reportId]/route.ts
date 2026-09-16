import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const allowedStatuses = new Set([
  'open',
  'pending',
  'reported_to_technician',
  'resolved',
])

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

async function requireReportEditor(request: NextRequest) {
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

  if (roleError || (userRole?.role !== 'admin' && userRole?.role !== 'user')) {
    return { error: 'Du har ikke adgang til at ændre rapporter', status: 403 } as const
  }

  return { supabase, role: userRole.role } as const
}

function isValidReportId(reportId: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reportId)
}

function optionalText(value: unknown, maximumLength: number) {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') return undefined

  const trimmed = value.trim()
  if (trimmed.length > maximumLength) return undefined
  return trimmed || null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { reportId: string } }
) {
  try {
    const auth = await requireReportEditor(request)

    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    if (!isValidReportId(params.reportId)) {
      return NextResponse.json({ error: 'Ugyldig rapport' }, { status: 400 })
    }

    const body = await request.json()
    const status = typeof body.status === 'string' ? body.status : ''
    const partsReplaced = optionalText(body.partsReplaced, 5000)
    const resolutionNotes = optionalText(body.resolutionNotes, 10000)

    if (!allowedStatuses.has(status)) {
      return NextResponse.json({ error: 'Vælg en gyldig status' }, { status: 400 })
    }

    if (partsReplaced === undefined || resolutionNotes === undefined) {
      return NextResponse.json({ error: 'Rapportens tekst er for lang eller ugyldig' }, { status: 400 })
    }

    if (status === 'resolved' && !resolutionNotes) {
      return NextResponse.json(
        { error: 'Beskriv venligst hvordan problemet blev løst' },
        { status: 400 }
      )
    }

    const { data, error } = await auth.supabase
      .from('issue_reports')
      .update({
        status,
        parts_replaced: partsReplaced,
        resolution_notes: resolutionNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.reportId)
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Rapporten blev ikke fundet' }, { status: 404 })

    return NextResponse.json({ reportId: data.id })
  } catch (error) {
    console.error('Error updating report:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Kunne ikke opdatere rapport' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { reportId: string } }
) {
  try {
    const auth = await requireReportEditor(request)

    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    if (auth.role !== 'admin') {
      return NextResponse.json(
        { error: 'Kun administratorer kan slette rapporter' },
        { status: 403 }
      )
    }

    if (!isValidReportId(params.reportId)) {
      return NextResponse.json({ error: 'Ugyldig rapport' }, { status: 400 })
    }

    const { data, error } = await auth.supabase
      .from('issue_reports')
      .delete()
      .eq('id', params.reportId)
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Rapporten blev ikke fundet' }, { status: 404 })

    return NextResponse.json({ reportId: data.id })
  } catch (error) {
    console.error('Error deleting report:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Kunne ikke slette rapport' },
      { status: 500 }
    )
  }
}
