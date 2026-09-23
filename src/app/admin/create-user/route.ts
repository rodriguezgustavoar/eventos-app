import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Faltan variables de entorno en el servidor (.env.local)' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const {
      email,
      password,
      full_name,
      role = 'user',
      slug = '',
      address = '',
      city = '',
      province = '',
      phone = '',
      instagram = '',
      facebook = '',
      google_maps_url = '',
      logo_url = '',
      category = 'pelotero',
      is_active = true,
    } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son obligatorios' },
        { status: 400 }
      )
    }

    // Aseguramos que solo guarde roles válidos ('admin' o 'user')
    const validRole = ['admin', 'user'].includes(role) ? role : 'user'

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 1. Crear usuario en Auth (aquí se guarda el email)
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user.id

    // 2. Insertar en la tabla profiles (SIN el campo email)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        full_name,
        role: validRole,
        slug,
        address,
        city,
        province,
        phone,
        instagram,
        facebook,
        google_maps_url,
        logo_url,
        category,
        is_active,
      })

    // Si la creación del perfil falla, limpiamos el usuario en Auth para evitar cuentas huérfanas
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: `Error en tabla profiles: ${profileError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, userId }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}