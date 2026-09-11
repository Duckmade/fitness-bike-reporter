import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const PUBLIC_CENTERS: Record<string, string> = {
  prismet: 'Prismet',
}

const ISSUE_CATEGORIES = [
  'Styr',
  'Sadel',
  'Højre pedal',
  'Venstre pedal',
  'Belastning',
  'Diverse',
] as const

const SYSTEM_REPORTER_EMAIL = 'member-reports@bike-reporter.invalid'

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Fejlmeldingssystemet er ikke konfigureret')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

async function getCenterAndBikes(centerSlug: string) {
  const centerName = PUBLIC_CENTERS[centerSlug]

  if (!centerName) return null

  const supabase = createAdminClient()
  const { data: center, error: centerError } = await supabase
    .from('centers')
    .select('id, name')
    .eq('name', centerName)
    .maybeSingle()

  if (centerError) throw centerError
  if (!center) return null

  const { data: bikes, error: bikesError } = await supabase
    .from('bikes')
    .select('id, bike_number')
    .eq('center_id', center.id)
    .order('bike_number')

  if (bikesError) throw bikesError

  return { supabase, center, bikes: bikes ?? [] }
}

async function getSystemReporterId(supabase: ReturnType<typeof createAdminClient>) {
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (usersError) throw usersError

  const existingUser = usersData.users.find((user) => user.email === SYSTEM_REPORTER_EMAIL)
  if (existingUser) return existingUser.id

  const { data, error: createError } = await supabase.auth.admin.createUser({
    email: SYSTEM_REPORTER_EMAIL,
    password: `${crypto.randomUUID()}-${crypto.randomUUID()}`,
    email_confirm: true,
    app_metadata: {
      system_account: true,
      source: 'member_report',
    },
  })

  if (!createError && data.user) return data.user.id

  // Another request may have created the system account at the same time.
  const { data: refreshedUsers, error: refreshError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (refreshError) throw refreshError

  const refreshedUser = refreshedUsers.users.find((user) => user.email === SYSTEM_REPORTER_EMAIL)
  if (!refreshedUser) throw createError ?? new Error('Kunne ikke oprette systembrugeren')

  return refreshedUser.id
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { centerSlug: string } }
) {
  try {
    const result = await getCenterAndBikes(params.centerSlug)

    if (!result) {
      return NextResponse.json({ error: 'Centeret blev ikke fundet' }, { status: 404 })
    }

    return NextResponse.json(
      {
        center: result.center,
        bikes: result.bikes,
        categories: ISSUE_CATEGORIES,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('Error loading public report form:', error)
    return NextResponse.json({ error: 'Kunne ikke indlæse cyklerne' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { centerSlug: string } }
) {
  try {
    const body = await request.json()
    const bikeId = typeof body.bikeId === 'string' ? body.bikeId : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const categories = Array.isArray(body.categories)
      ? body.categories.filter((category: unknown): category is string => (
          typeof category === 'string' && ISSUE_CATEGORIES.includes(category as typeof ISSUE_CATEGORIES[number])
        ))
      : []
    const website = typeof body.website === 'string' ? body.website : ''

    // Hidden honeypot field. Real visitors never fill this in.
    if (website) {
      return NextResponse.json({ success: true }, { status: 201 })
    }

    if (!bikeId) {
      return NextResponse.json({ error: 'Vælg et cykelnummer' }, { status: 400 })
    }

    if (!description) {
      return NextResponse.json({ error: 'Beskriv venligst fejlen' }, { status: 400 })
    }

    if (description.length > 2000) {
      return NextResponse.json({ error: 'Beskrivelsen er for lang' }, { status: 400 })
    }

    const result = await getCenterAndBikes(params.centerSlug)

    if (!result) {
      return NextResponse.json({ error: 'Centeret blev ikke fundet' }, { status: 404 })
    }

    if (!result.bikes.some((bike) => bike.id === bikeId)) {
      return NextResponse.json({ error: 'Den valgte cykel findes ikke i dette center' }, { status: 400 })
    }

    const systemReporterId = await getSystemReporterId(result.supabase)
    const categoryText = categories.length > 0 ? categories.join(', ') : 'Ikke angivet'
    const reportDescription = [
      'Medlemsfejlmelding',
      `Område: ${categoryText}`,
      `Beskrivelse: ${description}`,
    ].join('\n')

    const { error } = await result.supabase
      .from('issue_reports')
      .insert({
        bike_id: bikeId,
        user_id: systemReporterId,
        description: reportDescription,
        parts_replaced: null,
        status: 'open',
        resolution_notes: null,
      })

    if (error) throw error

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Error creating public report:', error)
    return NextResponse.json({ error: 'Kunne ikke registrere fejlmeldingen' }, { status: 500 })
  }
}
