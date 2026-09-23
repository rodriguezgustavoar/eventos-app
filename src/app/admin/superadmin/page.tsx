'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createUserAction } from './actions' // 👈 Importamos la Server Action

interface Profile {
  id: string
  full_name: string
  role: string
  is_active?: boolean
  slug?: string
  phone: string
  address: string
  city: string
  province: string
  instagram?: string
  facebook?: string
  google_maps_url?: string
  logo_url?: string
  category?: string
  gallery?: string
  updated_at?: string
}

const CATEGORIES = [
  { id: 'pelotero', label: '🎈 Pelotero / Salón Infantil' },
  { id: 'salon_fiestas', label: '🏰 Salón de Eventos Social' },
  { id: 'quinta', label: '🏡 Quinta / Espacio al Aire Libre' },
  { id: 'corporativo', label: '💼 Espacio Corporativo' },
]

export default function SuperAdminPage() {
  const [venues, setVenues] = useState<Profile[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Estado del buscador
  const [searchTerm, setSearchTerm] = useState('')

  // Campos de la Tabla profiles
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'admin' | 'user'>('user')
  const [isActive, setIsActive] = useState(true)
  const [slug, setSlug] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [phone, setPhone] = useState('')
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')
  const [googleMapsUrl, setGoogleMapsUrl] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [category, setCategory] = useState('pelotero')

  // Campos de Acceso / Login
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')

  const supabase = createClient()

  useEffect(() => {
    fetchVenues()
  }, [])

  const fetchVenues = async () => {
    setLoading(true)

    // Obtener el ID del usuario actual de la sesión activa
    const { data: authData } = await supabase.auth.getUser()
    const activeUserId = authData.user?.id || null
    setCurrentUserId(activeUserId)

    // Consulta de perfiles en Supabase
    let query = supabase
      .from('profiles')
      .select('*')
      .in('role', ['user', 'admin'])
      .order('updated_at', { ascending: false })

    // Excluir de la lista el perfil del usuario activo
    if (activeUserId) {
      query = query.neq('id', activeUserId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error de Supabase al consultar profiles:', error.message)
    } else if (data) {
      setVenues(data)
    }
    setLoading(false)
  }

  const resetForm = () => {
    setFullName('')
    setRole('user')
    setIsActive(true)
    setSlug('')
    setAddress('')
    setCity('')
    setProvince('')
    setPhone('')
    setInstagram('')
    setFacebook('')
    setGoogleMapsUrl('')
    setLogoUrl('')
    setCategory('pelotero')
    setAdminEmail('')
    setAdminPassword('')
    setEditingId(null)
    setShowForm(false)
  }

  const startEditing = (v: Profile) => {
    setEditingId(v.id)
    setFullName(v.full_name || '')
    setRole((v.role as 'admin' | 'user') || 'user')
    setIsActive(v.is_active ?? true)
    setSlug(v.slug || '')
    setAddress(v.address || '')
    setCity(v.city || '')
    setProvince(v.province || '')
    setPhone(v.phone || '')
    setInstagram(v.instagram || '')
    setFacebook(v.facebook || '')
    setGoogleMapsUrl(v.google_maps_url || '')
    setLogoUrl(v.logo_url || '')
    setCategory(v.category || 'pelotero')
    setAdminEmail('')
    setAdminPassword('')
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Genera un slug único agregando un correlativo si ya existe
  const generateUniqueSlug = async (baseSlug: string): Promise<string> => {
    const cleanBase = baseSlug.toLowerCase().trim().replace(/\s+/g, '-')
    if (!cleanBase) return ''

    // Buscar si ya existen slugs con esta base
    const { data, error } = await supabase
      .from('profiles')
      .select('slug')
      .like('slug', `${cleanBase}%`)

    if (error || !data || data.length === 0) {
      return cleanBase
    }

    const existingSlugs = new Set(data.map((item) => item.slug))

    if (!existingSlugs.has(cleanBase)) {
      return cleanBase
    }

    // Si la base exacta ya existe, buscar el siguiente correlativo libre
    let counter = 1
    while (existingSlugs.has(`${cleanBase}-${counter}`)) {
      counter++
    }

    return `${cleanBase}-${counter}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const rawSlug = slug.toLowerCase().trim().replace(/\s+/g, '-')

    if (!rawSlug) {
      alert('⚠️ El identificador slug no puede estar vacío.')
      return
    }

    if (editingId) {
      // EDICIÓN DE PERFIL EXISTENTE (se mantiene el slug original)
      setSubmitting(true)
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            role,
            is_active: isActive,
            address,
            city,
            province,
            phone,
            instagram,
            facebook,
            google_maps_url: googleMapsUrl,
            logo_url: logoUrl,
            category,
          })
          .eq('id', editingId)

        if (error) throw new Error(error.message)

        alert('✅ Espacio actualizado correctamente')
        resetForm()
        fetchVenues()
      } catch (err: any) {
        alert('❌ Error al actualizar: ' + err.message)
      } finally {
        setSubmitting(false)
      }
    } else {
      // REGISTRO NUEVO
      if (!adminEmail || !adminPassword) {
        alert('⚠️ Debés ingresar email y contraseña para el usuario.')
        return
      }

      setSubmitting(true)

      try {
        // Generar y verificar slug correlativo único
        const uniqueSlug = await generateUniqueSlug(rawSlug)

        const confirmCreate = confirm(
          `¿Estás seguro de registrar el espacio "${fullName}" con el identificador "/${uniqueSlug}" y el usuario "${adminEmail}"?`
        )

        if (!confirmCreate) {
          setSubmitting(false)
          return
        }

        // En lugar de usar try/catch directo con la Server Action que lanza excepciones:
const result = await createUserAction({
  email: adminEmail,
  password: adminPassword,
  full_name: fullName,
  role,
  is_active: isActive,
  slug: uniqueSlug,
  address,
  city,
  province,
  phone,
  instagram,
  facebook,
  google_maps_url: googleMapsUrl,
  logo_url: logoUrl,
  category,
})

if (!result.success) {
  alert('❌ Error: ' + result.error)
  setSubmitting(false)
  return
}

alert(`🎉 ¡Espacio y usuario creados con éxito! Slug asignado: /${uniqueSlug}`)
resetForm()
fetchVenues()
      } catch (err: any) {
        alert('❌ Error: ' + err.message)
      } finally {
        setSubmitting(false)
      }
    }
  }

  // Filtrar espacios según el término de búsqueda
  const filteredVenues = venues.filter((v) => {
    const term = searchTerm.toLowerCase().trim()
    if (!term) return true

    return (
      (v.full_name && v.full_name.toLowerCase().includes(term)) ||
      (v.slug && v.slug.toLowerCase().includes(term)) ||
      (v.city && v.city.toLowerCase().includes(term)) ||
      (v.province && v.province.toLowerCase().includes(term)) ||
      (v.phone && v.phone.includes(term))
    )
  })

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 bg-[#F3F4F6] min-h-screen text-[#1F2937] antialiased">
      {/* Header */}
      <div className="flex justify-between items-center bg-[#1F2937] text-white p-6 rounded-3xl shadow-md border border-slate-700">
        <div>
          <span className="text-xs font-bold text-[#0D9488] bg-teal-950/80 px-3 py-1 rounded-full uppercase tracking-wider border border-teal-800">
            Consola Master
          </span>
          <h1 className="text-2xl font-black mt-2 text-white">SuperAdmin — Gestión de Espacios 👑</h1>
          <p className="text-xs text-slate-400 font-medium">Creá espacios y asigná credenciales de login para sus administradores.</p>
        </div>

        <button
          onClick={() => {
            if (showForm) resetForm()
            else setShowForm(true)
          }}
          className="py-2.5 px-4 bg-[#0D9488] hover:bg-teal-700 font-bold text-xs rounded-xl transition-all text-white shadow-sm shadow-teal-600/20 active:scale-[0.99]"
        >
          {showForm ? '✕ Cancelar' : '➕ Nuevo Espacio'}
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-[#1F2937] text-base border-b border-slate-100 pb-3">
            {editingId ? '✏️ Editar Espacio' : '✨ Registrar Nuevo Espacio y Credenciales'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre Completo / Lugar</label>
              <input
                type="text"
                required
                placeholder="Ej: Magic Kids Palermo"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value)
                  if (!editingId) {
                    setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-[#F3F4F6] border border-slate-200 rounded-xl text-sm font-semibold text-[#1F2937] focus:ring-2 focus:ring-[#0D9488] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Rol</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
                className="w-full px-3.5 py-2.5 border border-teal-200 bg-teal-50 text-[#0D9488] font-bold rounded-xl text-sm focus:outline-none"
              >
                <option value="user">👤 Usuario (User)</option>
                <option value="admin">⚡ Administrador (Admin)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0D9488] focus:outline-none bg-[#F3F4F6] font-semibold text-[#1F2937]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Identificador Slug (URL) {editingId ? <span className="text-slate-400 font-normal">(Fijo)</span> : <span className="text-slate-400 font-normal">(Autogenerado/Correlativo)</span>}
              </label>
              <input
                type="text"
                required
                disabled={Boolean(editingId)}
                placeholder="ej: magic-kids-palermo"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className={`w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0D9488] focus:outline-none font-mono text-xs font-semibold ${
                  editingId ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-[#F3F4F6] text-[#0D9488]'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Teléfono / WhatsApp</label>
              <input
                type="tel"
                placeholder="+54911..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0D9488] focus:outline-none bg-[#F3F4F6] font-semibold text-[#1F2937]"
              />
            </div>
          </div>

          {/* Ubicación y Redes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Ciudad</label>
              <input
                type="text"
                placeholder="Ej: CABA"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0D9488] focus:outline-none bg-[#F3F4F6] font-semibold text-[#1F2937]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Provincia</label>
              <input
                type="text"
                placeholder="Ej: Buenos Aires"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0D9488] focus:outline-none bg-[#F3F4F6] font-semibold text-[#1F2937]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Dirección Física</label>
              <input
                type="text"
                placeholder="Ej: Av. San Martín 450"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0D9488] focus:outline-none bg-[#F3F4F6] font-semibold text-[#1F2937]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Instagram (@usuario)</label>
              <input
                type="text"
                placeholder="magickidspalermo"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0D9488] focus:outline-none bg-[#F3F4F6] font-semibold text-[#1F2937]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Facebook</label>
              <input
                type="text"
                placeholder="magickids.oficial"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0D9488] focus:outline-none bg-[#F3F4F6] font-semibold text-[#1F2937]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Enlace Google Maps</label>
              <input
                type="url"
                placeholder="https://maps.google.com/..."
                value={googleMapsUrl}
                onChange={(e) => setGoogleMapsUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0D9488] focus:outline-none bg-[#F3F4F6] font-semibold text-[#1F2937]"
              />
            </div>
          </div>

          {/* Control del Estado de la Cuenta */}
          <div className="flex items-center justify-between p-4 bg-[#F3F4F6] border border-slate-200/60 rounded-2xl">
            <div>
              <h4 className="text-xs font-bold text-[#1F2937]">Estado de Habilitación</h4>
              <p className="text-[11px] text-slate-500 font-medium">
                Permite o deshabilita el acceso de la cuenta al sistema.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-5 h-5 text-[#0D9488] rounded focus:ring-[#0D9488] accent-[#0D9488]"
              />
              <span className={`text-xs font-bold ${isActive ? 'text-teal-700' : 'text-rose-600'}`}>
                {isActive ? 'Activo' : 'Suspendido'}
              </span>
            </label>
          </div>

          {/* Credenciales de Inicio de Sesión */}
          {!editingId && (
            <div className="p-4 bg-teal-50 border border-teal-100 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider">
                🔑 Credenciales del Usuario
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email de Ingreso</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@elsalon.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0D9488] focus:outline-none bg-white font-semibold text-[#1F2937]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contraseña Inicial</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0D9488] focus:outline-none bg-white font-semibold text-[#1F2937]"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-[#0D9488] hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm transition-all text-sm active:scale-[0.99]"
            >
              {submitting ? 'Cargando...' : editingId ? '💾 Guardar Cambios' : '🚀 Registrar Espacio'}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-[#1F2937] font-bold rounded-xl text-sm transition-colors border border-slate-200"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista de Espacios */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-[#1F2937] text-lg">Espacios Registrados</h2>
            <p className="text-xs text-slate-400 font-medium">Gestioná y editá los salones y lugares cargados.</p>
          </div>
          <span className="text-xs font-bold text-[#0D9488] bg-teal-50 px-3 py-1 rounded-lg border border-teal-100 self-start sm:self-auto">
            {filteredVenues.length} de {venues.length} espacios
          </span>

        </div>

        {/* Buscador */}
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 Buscar por nombre, slug, ciudad, provincia o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2.5 pl-10 bg-[#F3F4F6] border border-slate-200 rounded-xl text-sm font-semibold text-[#1F2937] placeholder:text-slate-400 focus:ring-2 focus:ring-[#0D9488] focus:outline-none transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold bg-slate-200 hover:bg-slate-300 w-5 h-5 rounded-full flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-xs text-slate-500 py-4">Cargando lugares...</p>
        ) : filteredVenues.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            {searchTerm ? `No se encontraron resultados para "${searchTerm}".` : 'No hay espacios registrados aún.'}
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredVenues.map((v) => {
              const categoryLabel = CATEGORIES.find((c) => c.id === v.category)?.label || '🎈 Pelotero'
              const active = v.is_active ?? true

              return (
                <div key={v.id} className="p-5 bg-[#F3F4F6] rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="font-bold text-[#1F2937] text-base">{v.full_name || 'Sin Nombre'}</h3>
                        <p className="text-xs text-[#0D9488] font-bold">{categoryLabel}</p>
                      </div>
                      <div className="flex gap-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${active ? 'bg-teal-50 text-teal-800 border-teal-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                          {active ? 'Activo' : 'Suspendido'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-200 text-slate-700 border-slate-300 uppercase">
                          {v.role || 'user'}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1 bg-white p-3 rounded-xl border border-slate-200/60">
                      <p>📞 <strong>Teléfono:</strong> {v.phone || 'N/A'}</p>
                      <p>📍 <strong>Ubicación:</strong> {v.city ? `${v.city}, ${v.province}` : v.address || 'Sin especificar'}</p>
                      <p>🔗 <strong>Slug:</strong> <span className="font-mono text-[#0D9488] font-bold">/{v.slug || 'sin-slug'}</span></p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-end">
                    <button
                      onClick={() => startEditing(v)}
                      className="py-2 px-4 bg-teal-50 hover:bg-teal-100 text-[#0D9488] text-xs font-bold rounded-xl transition-colors flex items-center gap-1 border border-teal-200"
                    >
                      ✏️ Editar Información
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}