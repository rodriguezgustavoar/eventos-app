'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const MAX_GALLERY_IMAGES = 8

const WEEK_DAYS = [
  { id: 'lun', label: 'Lun' },
  { id: 'mar', label: 'Mar' },
  { id: 'mie', label: 'Mié' },
  { id: 'jue', label: 'Jue' },
  { id: 'vie', label: 'Vie' },
  { id: 'sab', label: 'Sáb' },
  { id: 'dom', label: 'Dom' },
]

interface FixedShift {
  id: string
  name: string
  start_time: string
  end_time: string
}

interface PricingScheme {
  id: string
  name: string
  days: string[] // ['lun', 'mar', 'mie', ...]
  includes_holidays: boolean
  base_price: number | string
  extra_hour_price: number | string
  half_extra_hour_price: number | string
}

interface ShiftSettings {
  turn_buffer_minutes: number
  shift_duration_minutes: number // Duración global común para todos los turnos
  allow_extra_hours: boolean
  fixed_shifts: FixedShift[]
  pricing_schemes: PricingScheme[]
}

export default function AccountPage() {
  const [loading, setLoading] = useState(true)

  // Estado para la pestaña activa
  const [activeTab, setActiveTab] = useState<'info' | 'shifts'>('info')

  // Datos de cuenta y rol
  const [userEmail, setUserEmail] = useState('')
  const [userRole, setUserRole] = useState<string>('user')

  // Datos del Salón / Pelotero
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [mapUrl, setMapUrl] = useState('')
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')

  // Configuración Completa de Turnos y Esquemas de Precios
  const [shiftSettings, setShiftSettings] = useState<ShiftSettings>({
    turn_buffer_minutes: 30,
    shift_duration_minutes: 180, // Por defecto 3 horas (180 minutos)
    allow_extra_hours: true,
    fixed_shifts: [
      { id: '1', name: 'Turno Mañana', start_time: '12:00', end_time: '15:00' },
      { id: '2', name: 'Turno Tarde', start_time: '16:00', end_time: '19:00' },
      { id: '3', name: 'Turno Noche', start_time: '20:00', end_time: '23:00' },
    ],
    pricing_schemes: [
      {
        id: '1',
        name: 'Tarifa Lunes a Miércoles',
        days: ['lun', 'mar', 'mie'],
        includes_holidays: false,
        base_price: 120000,
        extra_hour_price: 20000,
        half_extra_hour_price: 12000,
      },
      {
        id: '2',
        name: 'Tarifa Jueves y Viernes',
        days: ['jue', 'vie'],
        includes_holidays: false,
        base_price: 140000,
        extra_hour_price: 25000,
        half_extra_hour_price: 15000,
      },
      {
        id: '3',
        name: 'Tarifa Fines de Semana y Feriados',
        days: ['sab', 'dom'],
        includes_holidays: true,
        base_price: 180000,
        extra_hour_price: 30000,
        half_extra_hour_price: 18000,
      },
    ],
  })

  // Multimedia (Logo y Galería)
  const [logoUrl, setLogoUrl] = useState('')
  const [gallery, setGallery] = useState<string[]>([])
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)

  // Estado para la vista previa de imagen (Lightbox)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // Estados para formulario de contraseña
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Estados de retroalimentación
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isUpdatingShifts, setIsUpdatingShifts] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchUserData()
  }, [])

  // Cada vez que cambia la duración global o se cargan los datos, recalculamos las horas de fin automáticamente
  useEffect(() => {
    setShiftSettings((prev) => ({
      ...prev,
      fixed_shifts: prev.fixed_shifts.map((shift) => ({
        ...shift,
        end_time: calculateEndTime(shift.start_time, prev.shift_duration_minutes),
      })),
    }))
  }, [shiftSettings.shift_duration_minutes])

  const getStoragePathFromUrl = (url: string) => {
    try {
      const cleanUrl = url.split('?')[0]
      const parts = cleanUrl.split('/peloteros/')
      return parts[1] ? decodeURIComponent(parts[1]) : null
    } catch {
      return null
    }
  }

  const getEmbedMapUrl = (rawUrl: string) => {
    if (!rawUrl) return ''
    const cleanUrl = rawUrl.trim()
    if (cleanUrl.includes('<iframe')) {
      const srcMatch = cleanUrl.match(/src=["']([^"']+)["']/)
      if (srcMatch && srcMatch[1]) return srcMatch[1]
    }
    if (cleanUrl.includes('/embed')) return cleanUrl
    const placeMatch = cleanUrl.match(/\/maps\/place\/([^/@]+)/)
    if (placeMatch && placeMatch[1]) {
      const placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '))
      return `https://maps.google.com/maps?q=${encodeURIComponent(placeName)}&output=embed`
    }
    const coordsMatch = cleanUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (coordsMatch) {
      const [, lat, lng] = coordsMatch
      return `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`
    }
    return `https://maps.google.com/maps?q=${encodeURIComponent(cleanUrl)}&output=embed`
  }

  const fetchUserData = async () => {
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      const user = session.user
      setUserEmail(user.email || '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (profile) {
        setUserRole(profile.role || 'user')
        setFullName(profile.full_name || user.user_metadata?.full_name || '')
        setPhone(profile.phone || user.user_metadata?.phone || '')
        setAddress(profile.address || user.user_metadata?.address || '')
        setCity(profile.city || user.user_metadata?.city || '')
        setProvince(profile.province || user.user_metadata?.province || '')
        setMapUrl(profile.google_maps_url || user.user_metadata?.google_maps_url || user.user_metadata?.map_url || '')
        setInstagram(profile.instagram || user.user_metadata?.instagram || '')
        setFacebook(profile.facebook || user.user_metadata?.facebook || '')
        setLogoUrl(profile.logo_url || '')
        setGallery(profile.gallery || [])

        if (profile.shift_settings) {
          const loadedDuration = profile.shift_settings.shift_duration_minutes || 180
          const loadedShifts = (profile.shift_settings.fixed_shifts || []).map((s: any) => ({
            ...s,
            end_time: calculateEndTime(s.start_time, loadedDuration),
          }))

          setShiftSettings((prev) => ({
            ...prev,
            ...profile.shift_settings,
            shift_duration_minutes: loadedDuration,
            fixed_shifts: loadedShifts.length > 0 ? loadedShifts : prev.fixed_shifts,
            pricing_schemes: profile.shift_settings.pricing_schemes || prev.pricing_schemes,
          }))
        } else if (profile.turn_buffer_minutes !== undefined) {
          setShiftSettings((prev) => ({
            ...prev,
            turn_buffer_minutes: profile.turn_buffer_minutes,
          }))
        }
      }
    }

    setLoading(false)
  }

  // --- UTILIDAD PARA CONVERTIR HORA A MINUTOS ---
  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number)
    return h * 60 + m
  }

  // --- UTILIDAD PARA CALCULAR HORA FIN AUTOMÁTICAMENTE ---
  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    if (!startTime) return '00:00'
    const totalMins = timeToMinutes(startTime) + Number(durationMinutes)
    const endH = Math.floor(totalMins / 60) % 24
    const endM = totalMins % 60
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
  }

  // --- MANEJO DE TURNOS FIJOS ---
  const handleAddShift = () => {
    // Buscar una hora de inicio sugerida que no se repita
    let defaultStart = '16:00'
    const existingStarts = shiftSettings.fixed_shifts.map((s) => s.start_time)
    
    if (existingStarts.includes(defaultStart)) {
      // Intentar encontrar otra hora que no exista
      for (let h = 8; h <= 22; h += 3) {
        const candidate = `${String(h).padStart(2, '0')}:00`
        if (!existingStarts.includes(candidate)) {
          defaultStart = candidate
          break
        }
      }
    }

    const endTime = calculateEndTime(defaultStart, shiftSettings.shift_duration_minutes)

    const newShift: FixedShift = {
      id: Date.now().toString(),
      name: `Turno ${shiftSettings.fixed_shifts.length + 1}`,
      start_time: defaultStart,
      end_time: endTime,
    }
    setShiftSettings((prev) => ({
      ...prev,
      fixed_shifts: [...prev.fixed_shifts, newShift],
    }))
  }

  const handleRemoveShift = (id: string) => {
    setShiftSettings((prev) => ({
      ...prev,
      fixed_shifts: prev.fixed_shifts.filter((s) => s.id !== id),
    }))
  }

  const handleUpdateShift = (id: string, field: keyof FixedShift, value: string) => {
    setShiftSettings((prev) => ({
      ...prev,
      fixed_shifts: prev.fixed_shifts.map((s) => {
        if (s.id !== id) return s

        const updated = { ...s, [field]: value }

        // Si cambia la hora de inicio, recalculamos automáticamente el fin usando la duración global
        if (field === 'start_time') {
          updated.end_time = calculateEndTime(value, prev.shift_duration_minutes)
        }

        return updated
      }),
    }))
  }

  // --- MANEJO DE ESQUEMAS DE TARIFAS ---
  const handleAddPricingScheme = () => {
    const newScheme: PricingScheme = {
      id: Date.now().toString(),
      name: `Tarifa ${shiftSettings.pricing_schemes.length + 1}`,
      days: [],
      includes_holidays: false,
      base_price: '',
      extra_hour_price: '',
      half_extra_hour_price: '',
    }
    setShiftSettings((prev) => ({
      ...prev,
      pricing_schemes: [...prev.pricing_schemes, newScheme],
    }))
  }

  const handleRemovePricingScheme = (id: string) => {
    setShiftSettings((prev) => ({
      ...prev,
      pricing_schemes: prev.pricing_schemes.filter((s) => s.id !== id),
    }))
  }

  const handleUpdatePricingScheme = (id: string, field: keyof PricingScheme, value: any) => {
    setShiftSettings((prev) => ({
      ...prev,
      pricing_schemes: prev.pricing_schemes.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    }))
  }

  const handleToggleDayInScheme = (schemeId: string, dayId: string) => {
    setShiftSettings((prev) => ({
      ...prev,
      pricing_schemes: prev.pricing_schemes.map((s) => {
        if (s.id !== schemeId) return s
        const days = s.days.includes(dayId)
          ? s.days.filter((d) => d !== dayId)
          : [...s.days, dayId]
        return { ...s, days }
      }),
    }))
  }

  // --- SUBIR / CAMBIAR LOGO ---
  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    setMessage(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      setUploadingLogo(false)
      return
    }

    if (logoUrl) {
      const oldPath = getStoragePathFromUrl(logoUrl)
      if (oldPath) {
        await supabase.storage.from('peloteros').remove([oldPath])
      }
    }

    const fileExt = file.name.split('.').pop()
    const filePath = `${session.user.id}/logo-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('peloteros')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      setMessage({ text: 'Error al subir el logo: ' + uploadError.message, type: 'error' })
      setUploadingLogo(false)
      return
    }

    const { data } = supabase.storage.from('peloteros').getPublicUrl(filePath)
    const publicUrl = `${data.publicUrl}?t=${Date.now()}`

    setLogoUrl(publicUrl)
    setUploadingLogo(false)
    setMessage({ text: '🖼️ Logo actualizado. Acordate de guardar los cambios para confirmar.', type: 'success' })
  }

  // --- SUBIR FOTOS A GALERÍA ---
  const handleUploadGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setMessage(null)
    const availableSlots = MAX_GALLERY_IMAGES - gallery.length

    if (availableSlots <= 0) {
      setMessage({
        text: `⚠️ Has alcanzado el límite máximo de ${MAX_GALLERY_IMAGES} imágenes.`,
        type: 'error',
      })
      e.target.value = ''
      return
    }

    setUploadingGallery(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      setUploadingGallery(false)
      return
    }

    const filesToUpload = Array.from(files).slice(0, availableSlots)

    try {
      const uploadPromises = filesToUpload.map(async (file) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `${session.user.id}/gallery/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('peloteros')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('peloteros').getPublicUrl(filePath)
        return data.publicUrl
      })

      const newUploadedUrls = await Promise.all(uploadPromises)
      setGallery((prev) => [...prev, ...newUploadedUrls])

      setMessage({ text: '📸 Galería actualizada. Acordate de guardar los cambios.', type: 'success' })
    } catch (error: any) {
      setMessage({ text: 'Error al subir algunas imágenes: ' + error.message, type: 'error' })
    } finally {
      setUploadingGallery(false)
      e.target.value = ''
    }
  }

  const handleRemoveImage = async (urlToRemove: string) => {
    const storagePath = getStoragePathFromUrl(urlToRemove)
    if (storagePath) {
      await supabase.storage.from('peloteros').remove([storagePath])
    }

    const updatedGallery = gallery.filter((url) => url !== urlToRemove)
    setGallery(updatedGallery)

    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await supabase.from('profiles').update({
        gallery: updatedGallery,
        updated_at: new Date().toISOString(),
      }).eq('id', session.user.id)
    }

    setMessage({ text: '🗑️ Foto eliminada de la galería.', type: 'success' })
  }

  const handleRemoveLogo = async () => {
    if (logoUrl) {
      const storagePath = getStoragePathFromUrl(logoUrl)
      if (storagePath) {
        await supabase.storage.from('peloteros').remove([storagePath])
      }
    }

    setLogoUrl('')
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await supabase.from('profiles').update({
        logo_url: '',
        updated_at: new Date().toISOString(),
      }).eq('id', session.user.id)
    }

    setMessage({ text: '🗑️ Logo eliminado.', type: 'success' })
  }

  // Guardar datos del Pelotero / Salón
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdatingProfile(true)
    setMessage(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      setMessage({ text: 'No hay sesión activa.', type: 'error' })
      setIsUpdatingProfile(false)
      return
    }

    const userId = session.user.id

    const profilePayload = {
      full_name: fullName,
      phone,
      address,
      city,
      province,
      google_maps_url: mapUrl,
      instagram,
      facebook,
      logo_url: logoUrl,
    }

    await supabase.auth.updateUser({ data: profilePayload })

    const { error: dbError } = await supabase.from('profiles').update({
      full_name: fullName,
      phone,
      address,
      city,
      province,
      google_maps_url: mapUrl,
      instagram,
      facebook,
      logo_url: logoUrl,
      gallery,
      updated_at: new Date().toISOString(),
    }).eq('id', userId)

    setIsUpdatingProfile(false)

    if (dbError) {
      setMessage({ text: 'Error al actualizar los datos: ' + dbError.message, type: 'error' })
    } else {
      setMessage({ text: '✨ ¡Información del salón actualizada con éxito!', type: 'success' })
    }
  }

  // Guardar configuración de Turnos y Esquemas de Precios con Validación de Superposición y Turnos Iguales
  const handleUpdateShiftsConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    const bufferMinutes = Number(shiftSettings.turn_buffer_minutes) || 0
    const shifts = shiftSettings.fixed_shifts

    // 1. Validar turnos con hora de inicio idéntica
    const startTimesSet = new Set()
    for (const shift of shifts) {
      if (startTimesSet.has(shift.start_time)) {
        setMessage({
          text: `⚠️ No se pueden guardar turnos iguales (hay más de un turno que inicia a las ${shift.start_time} hs).`,
          type: 'error',
        })
        return
      }
      startTimesSet.add(shift.start_time)
    }

    // 2. Validar superposición considerando el buffer / tiempo entre turnos
    // Ordenamos los turnos cronológicamente por su hora de inicio
    const sortedShifts = [...shifts].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))

    for (let i = 0; i < sortedShifts.length - 1; i++) {
      const current = sortedShifts[i]
      const next = sortedShifts[i + 1]

      const currentStartMins = timeToMinutes(current.start_time)
      const currentEndMins = currentStartMins + Number(shiftSettings.shift_duration_minutes)
      // El tiempo total ocupado incluye el turno de fin + el buffer de descanso/limpieza
      const currentTotalOccupiedMins = currentEndMins + bufferMinutes

      const nextStartMins = timeToMinutes(next.start_time)

      if (currentTotalOccupiedMins > nextStartMins) {
        setMessage({
          text: `⚠️ Conflicto de horarios: El "${current.name}" (${current.start_time} - ${current.end_time} hs) requiere un margen con ${bufferMinutes} min de descanso y se superpone o no respeta el buffer con el "${next.name}" (${next.start_time} hs).`,
          type: 'error',
        })
        return
      }
    }

    setIsUpdatingShifts(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      setMessage({ text: 'No hay sesión activa.', type: 'error' })
      setIsUpdatingShifts(false)
      return
    }

    const userId = session.user.id

    const formattedSchemes = shiftSettings.pricing_schemes.map((s) => ({
      ...s,
      base_price: Number(s.base_price) || 0,
      extra_hour_price: Number(s.extra_hour_price) || 0,
      half_extra_hour_price: Number(s.half_extra_hour_price) || 0,
    }))

    const payload = {
      turn_buffer_minutes: bufferMinutes,
      shift_duration_minutes: Number(shiftSettings.shift_duration_minutes) || 180,
      allow_extra_hours: shiftSettings.allow_extra_hours,
      fixed_shifts: shifts,
      pricing_schemes: formattedSchemes,
    }

    await supabase.auth.updateUser({
      data: {
        turn_buffer_minutes: payload.turn_buffer_minutes,
        shift_settings: payload,
      },
    })

    const { error: dbError } = await supabase.from('profiles').update({
      turn_buffer_minutes: payload.turn_buffer_minutes,
      shift_settings: payload,
      updated_at: new Date().toISOString(),
    }).eq('id', userId)

    setIsUpdatingShifts(false)

    if (dbError) {
      setMessage({ text: 'Error al guardar la configuración: ' + dbError.message, type: 'error' })
    } else {
      setMessage({ text: '⏱️ ¡Configuración de turnos y tarifas guardada con éxito en la base de datos!', type: 'success' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4">
        <p className="text-[#1F2937] font-medium text-xs">Cargando datos de tu cuenta... 👤</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] p-4 md:p-8 max-w-3xl mx-auto space-y-6 text-[#1F2937] antialiased">
      {/* Encabezado */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
        <span className="text-xs font-bold text-[#0D9488] bg-teal-50 px-3 py-1 rounded-full uppercase tracking-wider inline-block border border-teal-100">
          Configuración
        </span>
        <h1 className="text-2xl font-black text-[#1F2937]">Mi Cuenta 👤</h1>
        <p className="text-xs text-slate-500 font-medium">
          Administra la información de tu salón, turnos, tarifas personalizadas y accesos.
        </p>
      </div>

      {/* Alerta de Mensaje */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold ${
            message.type === 'success'
              ? 'bg-teal-50 text-teal-800 border border-teal-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* NAVEGACIÓN POR PESTAÑAS (TABS) */}
      <div className="flex bg-slate-200/80 p-1.5 rounded-2xl gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'info'
              ? 'bg-white text-[#1F2937] shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>🏬</span> Datos del Salón
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('shifts')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'shifts'
              ? 'bg-white text-[#1F2937] shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>⏰</span> Información de Turnos y Tarifas
        </button>
      </div>

      {/* CONTENIDO PESTAÑA 1: DATOS DEL SALÓN */}
      {activeTab === 'info' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <h2 className="text-base font-black text-[#1F2937] border-b border-slate-100 pb-3">
            🏬 Datos del Pelotero / Salón
          </h2>

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#F3F4F6] p-4 rounded-2xl border border-slate-200/60">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Correo Electrónico (Titular)
                </label>
                <input
                  type="email"
                  disabled
                  value={userEmail}
                  className="w-full px-3 py-2 bg-slate-200/60 border border-slate-300/60 rounded-xl text-xs font-semibold text-slate-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Rol de Usuario
                </label>
                <div className="flex items-center gap-1.5 h-9 px-3 bg-slate-200/60 border border-slate-300/60 rounded-xl">
                  <span className="text-xs">{userRole === 'admin' ? '⚡' : '👤'}</span>
                  <span
                    className={`text-xs font-black uppercase ${
                      userRole === 'admin' ? 'text-[#0D9488]' : 'text-slate-700'
                    }`}
                  >
                    {userRole}
                  </span>
                </div>
              </div>
            </div>

            {/* SECCIÓN MULTIMEDIA */}
            <div className="space-y-5 pt-2 border-t border-slate-100">
              <h3 className="text-xs font-black uppercase text-[#0D9488] tracking-wider">
                🖼️ Logo y Galería de Fotos
              </h3>

              {/* Logo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Logo del Salón</label>
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => logoUrl && setPreviewImage(logoUrl)}
                    className={`w-20 h-20 rounded-2xl bg-[#F3F4F6] border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 relative group ${
                      logoUrl ? 'cursor-pointer hover:ring-2 hover:ring-teal-400' : ''
                    }`}
                  >
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">🎪</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="cursor-pointer inline-flex items-center justify-center py-2 px-4 bg-slate-100 hover:bg-slate-200 text-[#1F2937] text-xs font-bold rounded-xl border border-slate-200">
                      {uploadingLogo ? 'Subiendo...' : logoUrl ? 'Cambiar Logo' : 'Seleccionar Logo'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadLogo}
                        disabled={uploadingLogo}
                        className="hidden"
                      />
                    </label>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="text-left text-xs text-rose-600 hover:underline font-semibold"
                      >
                        Eliminar logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Galería */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Galería del Pelotero ({gallery.length}/{MAX_GALLERY_IMAGES})
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {gallery.map((url, index) => (
                    <div
                      key={index}
                      className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-[#F3F4F6] cursor-pointer"
                    >
                      <img
                        src={url}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-full object-cover"
                        onClick={() => setPreviewImage(url)}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveImage(url)
                        }}
                        className="absolute top-1.5 right-1.5 bg-rose-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {gallery.length < MAX_GALLERY_IMAGES && (
                    <label className="aspect-square rounded-2xl border-2 border-dashed border-teal-200 hover:border-[#0D9488] bg-teal-50/40 flex flex-col items-center justify-center text-[#0D9488] cursor-pointer p-2">
                      <span className="text-xl font-bold">{uploadingGallery ? '⌛' : '+'}</span>
                      <span className="text-[10px] font-bold mt-1">
                        {uploadingGallery ? 'Subiendo...' : 'Agregar fotos'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleUploadGallery}
                        disabled={uploadingGallery}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Datos Personales / Comerciales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Salón *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F3F4F6] border border-slate-200 rounded-xl text-xs font-semibold text-[#1F2937]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono / WhatsApp</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F3F4F6] border border-slate-200 rounded-xl text-xs font-semibold text-[#1F2937]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dirección</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F3F4F6] border border-slate-200 rounded-xl text-xs font-semibold text-[#1F2937]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ciudad</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F3F4F6] border border-slate-200 rounded-xl text-xs font-semibold text-[#1F2937]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Provincia</label>
                <input
                  type="text"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F3F4F6] border border-slate-200 rounded-xl text-xs font-semibold text-[#1F2937]"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-700">🗺️ Enlace de Google Maps</label>
              <input
                type="text"
                value={mapUrl}
                onChange={(e) => setMapUrl(e.target.value)}
                className="w-full px-3 py-2 bg-[#F3F4F6] border border-slate-200 rounded-xl text-xs font-semibold text-[#1F2937]"
              />

              {mapUrl && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-[#F3F4F6] h-48 w-full">
                  <iframe
                    title="Google Maps"
                    src={getEmbedMapUrl(mapUrl)}
                    className="w-full h-full border-0"
                    loading="lazy"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Instagram (@usuario)</label>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F3F4F6] border border-slate-200 rounded-xl text-xs font-semibold text-[#1F2937]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Facebook</label>
                <input
                  type="text"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F3F4F6] border border-slate-200 rounded-xl text-xs font-semibold text-[#1F2937]"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="py-2.5 px-5 bg-[#0D9488] text-white font-bold text-xs rounded-xl hover:bg-teal-700 transition-all disabled:opacity-50"
              >
                {isUpdatingProfile ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONTENIDO PESTAÑA 2: INFORMACIÓN DE TURNOS Y TARIFAS DINÁMICAS */}
      {activeTab === 'shifts' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-base font-black text-[#1F2937] border-b border-slate-100 pb-3">
            ⏰ Configuración de Turnos y Tarifas Personalizadas
          </h2>

          <form onSubmit={handleUpdateShiftsConfig} className="space-y-6">
            
            {/* DURACIÓN GENERAL DE LOS TURNOS */}
            <div className="bg-teal-50/60 p-4 rounded-2xl border border-teal-100 space-y-2">
              <label className="block text-xs font-black uppercase text-[#0D9488]">
                ⏱️ Duración General de los Turnos (Común para todos)
              </label>
              <p className="text-[11px] text-slate-600">
                Define cuánto dura un turno estándar en tu salón. La hora de fin de cada turno se calculará automáticamente a partir de su hora de inicio.
              </p>
              <select
                value={shiftSettings.shift_duration_minutes}
                onChange={(e) =>
                  setShiftSettings({ ...shiftSettings, shift_duration_minutes: Number(e.target.value) })
                }
                className="w-full max-w-xs px-3 py-2 bg-white border border-teal-200 rounded-xl text-xs font-bold text-[#1F2937]"
              >
                <option value={120}>2 Horas (120 minutos)</option>
                <option value={150}>2.5 Horas (150 minutos)</option>
                <option value={180}>3 Horas (180 minutos)</option>
                <option value={210}>3.5 Horas (210 minutos)</option>
                <option value={240}>4 Horas (240 minutos)</option>
                <option value={300}>5 Horas (300 minutos)</option>
              </select>
            </div>

            {/* 1. TURNOS PREDEFINIDOS */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase text-[#0D9488] tracking-wider">
                    📌 Turnos Predefinidos (Plantillas)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Establece el nombre y la hora de inicio. El final se calcula automáticamente.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddShift}
                  className="py-1.5 px-3 bg-teal-50 text-[#0D9488] font-bold text-xs rounded-xl border border-teal-200 hover:bg-teal-100 transition-all flex items-center gap-1"
                >
                  <span>➕</span> Agregar Turno
                </button>
              </div>

              <div className="space-y-3">
                {shiftSettings.fixed_shifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="p-4 bg-[#F3F4F6] rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
                  >
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre</label>
                      <input
                        type="text"
                        value={shift.name}
                        onChange={(e) => handleUpdateShift(shift.id, 'name', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                        placeholder="Ej: Turno Tarde"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hora Inicio</label>
                      <input
                        type="time"
                        value={shift.start_time}
                        onChange={(e) => handleUpdateShift(shift.id, 'start_time', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                      />
                    </div>

                    <div className="sm:col-span-4 flex flex-col justify-center">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Calcula Fin (Automático)</span>
                      <span className="px-3 py-2 bg-teal-50 border border-teal-200 rounded-xl text-xs font-black text-teal-900 block text-center">
                        {shift.end_time || '---'} hs
                      </span>
                    </div>

                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveShift(shift.id)}
                        className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl border border-rose-200 text-xs font-bold transition-all w-full flex items-center justify-center"
                        title="Eliminar Turno"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. REGLAS DE TIEMPO Y BUFFER */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ⏱️ Tiempo libre / limpieza entre turnos (minutos)
                </label>
                <input
                  type="number"
                  min="0"
                  value={shiftSettings.turn_buffer_minutes}
                  onChange={(e) =>
                    setShiftSettings({ ...shiftSettings, turn_buffer_minutes: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-[#F3F4F6] border border-slate-200 rounded-xl text-xs font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Evita que se encimen reservas seguidas dejando este margen de descanso.
                </p>
              </div>

              <div className="flex items-center justify-between bg-[#F3F4F6] p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="block text-xs font-bold text-slate-700">Permitir Horas Extras</span>
                  <span className="text-[10px] text-slate-400">Habilita sumar tiempo adicional al turno base.</span>
                </div>
                <input
                  type="checkbox"
                  checked={shiftSettings.allow_extra_hours}
                  onChange={(e) =>
                    setShiftSettings({ ...shiftSettings, allow_extra_hours: e.target.checked })
                  }
                  className="w-5 h-5 rounded text-[#0D9488] focus:ring-[#0D9488]"
                />
              </div>
            </div>

            {/* 3. ESQUEMAS DE TARIFAS */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase text-[#0D9488] tracking-wider">
                    💰 Esquemas de Tarifas por Día y Feriados
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Establece cuánto cuesta la base del turno y las horas extra según los días de la semana.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddPricingScheme}
                  className="py-1.5 px-3 bg-teal-50 text-[#0D9488] font-bold text-xs rounded-xl border border-teal-200 hover:bg-teal-100 transition-all flex items-center gap-1"
                >
                  <span>➕</span> Agregar Tarifa
                </button>
              </div>

              <div className="space-y-4">
                {shiftSettings.pricing_schemes.map((scheme) => (
                  <div key={scheme.id} className="p-5 bg-[#F3F4F6] rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex justify-between items-center gap-3">
                      <input
                        type="text"
                        value={scheme.name}
                        onChange={(e) => handleUpdatePricingScheme(scheme.id, 'name', e.target.value)}
                        className="w-full max-w-sm px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                        placeholder="Nombre de la Tarifa"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePricingScheme(scheme.id)}
                        className="py-1.5 px-3 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl border border-rose-200 text-xs font-bold transition-all"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>

                    {/* Selector de Días */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">
                        Días de aplicación:
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {WEEK_DAYS.map((day) => {
                          const isSelected = scheme.days.includes(day.id)
                          return (
                            <button
                              key={day.id}
                              type="button"
                              onClick={() => handleToggleDayInScheme(scheme.id, day.id)}
                              className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                                isSelected
                                  ? 'bg-[#0D9488] text-white border-[#0D9488] shadow-sm'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {day.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Checkbox Feriados */}
                    <div>
                      <label className="inline-flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={scheme.includes_holidays}
                          onChange={(e) => handleUpdatePricingScheme(scheme.id, 'includes_holidays', e.target.checked)}
                          className="rounded text-[#0D9488] focus:ring-[#0D9488]"
                        />
                        🎉 Aplicar también en días Feriados
                      </label>
                    </div>

                    {/* Precios */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/60">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Precio Base ($)</label>
                        <input
                          type="number"
                          value={scheme.base_price}
                          onChange={(e) => handleUpdatePricingScheme(scheme.id, 'base_price', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                          placeholder="Ej: 120000"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hora Extra ($)</label>
                        <input
                          type="number"
                          value={scheme.extra_hour_price}
                          onChange={(e) => handleUpdatePricingScheme(scheme.id, 'extra_hour_price', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                          placeholder="Ej: 20000"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Media Hora Extra ($)</label>
                        <input
                          type="number"
                          value={scheme.half_extra_hour_price}
                          onChange={(e) => handleUpdatePricingScheme(scheme.id, 'half_extra_hour_price', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                          placeholder="Ej: 12000"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={isUpdatingShifts}
                className="py-2.5 px-5 bg-[#0D9488] text-white font-bold text-xs rounded-xl hover:bg-teal-700 transition-all disabled:opacity-50"
              >
                {isUpdatingShifts ? 'Guardando configuración...' : '⏱️ Guardar Configuración de Turnos'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}