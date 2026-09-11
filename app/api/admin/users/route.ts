import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type UserRole = 'admin' | 'user'

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
    return { error: 'Du har ikke adgang til brugeradministration', status: 403 } as const
  }

  return { supabase, user } as const
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'admin' || value === 'user'
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)

    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data: authUsers, error: usersError } = await auth.supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    if (usersError) throw usersError

    const { data: roles, error: rolesError } = await auth.supabase
      .from('user_roles')
      .select('user_id, role')

    if (rolesError) throw rolesError

    const rolesByUserId = new Map(
      (roles ?? []).map((role) => [role.user_id, role.role])
    )

    const users = authUsers.users
      .map((user) => ({
        id: user.id,
        email: user.email ?? 'E-mail mangler',
        role: rolesByUserId.get(user.id) ?? 'user',
        createdAt: user.created_at,
      }))
      .sort((a, b) => a.email.localeCompare(b.email, 'da'))

    return NextResponse.json({ users, currentUserId: auth.user.id })
  } catch (error) {
    console.error('Error loading users:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Kunne ikke indlæse brugere' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)

    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const role = body.role

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Indtast en gyldig e-mailadresse' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Adgangskoden skal være på mindst 8 tegn' },
        { status: 400 }
      )
    }

    if (!isUserRole(role)) {
      return NextResponse.json({ error: 'Vælg en gyldig brugerrolle' }, { status: 400 })
    }

    const { data, error: createError } = await auth.supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError) {
      const message = createError.message.toLowerCase().includes('already')
        ? 'Der findes allerede en bruger med denne e-mailadresse'
        : createError.message

      return NextResponse.json({ error: message }, { status: 400 })
    }

    const { error: roleError } = await auth.supabase
      .from('user_roles')
      .upsert({ user_id: data.user.id, role }, { onConflict: 'user_id' })

    if (roleError) {
      await auth.supabase.auth.admin.deleteUser(data.user.id)
      throw roleError
    }

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email ?? email,
        role,
        createdAt: data.user.created_at,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Kunne ikke oprette brugeren' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)

    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const userId = typeof body.userId === 'string' ? body.userId : ''
    const role = body.role

    if (!userId || !isUserRole(role)) {
      return NextResponse.json({ error: 'Ugyldig bruger eller rolle' }, { status: 400 })
    }

    if (userId === auth.user.id && role !== 'admin') {
      return NextResponse.json(
        { error: 'Du kan ikke fjerne din egen administratoradgang' },
        { status: 400 }
      )
    }

    const { error } = await auth.supabase
      .from('user_roles')
      .upsert({ user_id: userId, role }, { onConflict: 'user_id' })

    if (error) throw error

    return NextResponse.json({ userId, role })
  } catch (error) {
    console.error('Error updating user role:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Kunne ikke opdatere brugerrollen' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)

    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const userId = typeof body.userId === 'string' ? body.userId : ''

    if (!userId) {
      return NextResponse.json({ error: 'Ugyldig bruger' }, { status: 400 })
    }

    if (userId === auth.user.id) {
      return NextResponse.json(
        { error: 'Du kan ikke slette din egen administratorkonto' },
        { status: 400 }
      )
    }

    const { error } = await auth.supabase.auth.admin.deleteUser(userId)

    if (error) throw error

    return NextResponse.json({ userId })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Kunne ikke slette brugeren' },
      { status: 500 }
    )
  }
}
