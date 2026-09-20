import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CENTER_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Besøgsstatistik er ikke konfigureret')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { centerSlug: string } }
) {
  try {
    if (!CENTER_SLUG_PATTERN.test(params.centerSlug)) {
      return NextResponse.json({ success: false }, { status: 404 })
    }

    const body = await request.json()
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : ''

    if (!SESSION_ID_PATTERN.test(sessionId)) {
      return NextResponse.json({ success: false }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: center, error: centerError } = await supabase
      .from('centers')
      .select('id')
      .eq('public_slug', params.centerSlug)
      .maybeSingle()

    if (centerError) throw centerError
    if (!center) return NextResponse.json({ success: false }, { status: 404 })

    const { error: insertError } = await supabase
      .from('public_form_visits')
      .insert({
        center_id: center.id,
        session_id: sessionId,
        source: 'public_report_page',
      })

    if (insertError && insertError.code !== '23505') throw insertError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error registering public form visit:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
