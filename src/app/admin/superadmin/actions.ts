'use server'

import { createClient } from '@supabase/supabase-js'

export async function createUserAction(formData: {
  email: string
  password: string
  full_name: string
  role: 'admin' | 'user'
  slug: string
  address?: string
  city?: string
  province?: string
  phone?: string
  instagram?: string
  facebook?: string
  google_maps_url?: string
  logo_url?: string
  category?: string
  is_active?: boolean
}) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return { success: false, error: 'Faltan variables de entorno en el servidor' }
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 1. Crear usuario en Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: formData.email,
      password: formData.password,
      email_confirm: true,
    })

    if (authError) {
      return { success: false, error: authError.message }
    }

    const userId = authData.user.id

    // 2. Insertar en profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        full_name: formData.full_name,
        role: formData.role,
        slug: formData.slug,
        address: formData.address || '',
        city: formData.city || '',
        province: formData.province || '',
        phone: formData.phone || '',
        instagram: formData.instagram || '',
        facebook: formData.facebook || '',
        google_maps_url: formData.google_maps_url || '',
        logo_url: formData.logo_url || '',
        category: formData.category || 'pelotero',
        is_active: formData.is_active ?? true,
      })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return { success: false, error: `Error en tabla profiles: ${profileError.message}` }
    }

    return { success: true, userId }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error interno en el servidor' }
  }
}