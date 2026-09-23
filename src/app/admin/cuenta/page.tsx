'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const MAX_GALLERY_IMAGES = 8

export default function AccountPage() {
  const [loading, setLoading] = useState(true)

  // Datos de cuenta y rol
  const [userEmail, setUserEmail] = useState('')
  const [userRole, setUserRole] = useState<'Cliente' | 'superAdmin'>('Cliente')

  // Datos del Salón / Pelotero
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [mapUrl, setMapUrl] = useState('')
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')

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
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchUserData()
  }, [])

  // Helper para extraer la ruta interna del archivo dentro del Bucket desde su URL pública
  const getStoragePathFromUrl = (url: string) => {
    try {
      const cleanUrl = url.split('?')[0]
      const parts = cleanUrl.split('/peloteros/')
      return parts[1] ? decodeURIComponent(parts[1]) : null
    } catch {
      return null
    }
  }

  // Helper para adaptar / procesar URL de Google Maps para el iframe de vista previa
  const getEmbedMapUrl = (rawUrl: string) => {
    if (!rawUrl) return ''

    const cleanUrl = rawUrl.trim()

    // 1. Si pegó el snippet <iframe> completo
    if (cleanUrl.includes('<iframe')) {
      const srcMatch = cleanUrl.match(/src=["']([^"']+)["']/)
      if (srcMatch && srcMatch[1]) return srcMatch[1]
    }

    // 2. Si ya es una URL de incrustación (/embed)
    if (cleanUrl.includes('/embed')) {
      return cleanUrl
    }

    // 3. Extraer el nombre del lugar de la ruta /place/Nombre+Lugar/
    const placeMatch = cleanUrl.match(/\/maps\/place\/([^/@]+)/)
    if (placeMatch && placeMatch[1]) {
      const placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '))
      return `https://maps.google.com/maps?q=${encodeURIComponent(placeName)}&output=embed`
    }

    // 4. Si no hay /place/, extraer las coordenadas del centro del mapa (@lat,lng)
    const coordsMatch = cleanUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (coordsMatch) {
      const [, lat, lng] = coordsMatch
      return `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`
    }

    // 5. Si es un texto plano o término de búsqueda simple
    return `https://maps.google.com/maps?q=${encodeURIComponent(cleanUrl)}&output=embed`
  }

  const fetchUserData = async () => {
    setLoading(true)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.user) {
      const user = session.user
      setUserEmail(user.email || '')

      // Determinar Rol
      const roleFromMeta = user.user_metadata?.role || 'Cliente'
      setUserRole(roleFromMeta === 'superAdmin' ? 'superAdmin' : 'Cliente')

      // Cargar perfil desde la base de datos
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (profile) {
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
      } else {
        // Respaldo desde metadata
        setFullName(user.user_metadata?.full_name || '')
        setPhone(user.user_metadata?.phone || '')
        setAddress(user.user_metadata?.address || '')
        setCity(user.user_metadata?.city || '')
        setProvince(user.user_metadata?.province || '')
        setMapUrl(user.user_metadata?.google_maps_url || user.user_metadata?.map_url || '')
        setInstagram(user.user_metadata?.instagram || '')
        setFacebook(user.user_metadata?.facebook || '')
        setGallery([])
      }
    }

    setLoading(false)
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
    setMessage({ text: '🖼️ Logo actualizado. Acordate de guardar los cambios para confirmar en tu perfil.', type: 'success' })
  }

  // --- SUBIR FOTOS A GALERÍA (CON LÍMITE DE 8) ---
  const handleUploadGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setMessage(null)

    const availableSlots = MAX_GALLERY_IMAGES - gallery.length

    if (availableSlots <= 0) {
      setMessage({
        text: `⚠️ Has alcanzado el límite máximo de ${MAX_GALLERY_IMAGES} imágenes en la galería.`,
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
    const wasTruncated = files.length > availableSlots

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

      if (wasTruncated) {
        setMessage({
          text: `📸 Se subieron solo ${availableSlots} imagen(es) para no superar el límite de ${MAX_GALLERY_IMAGES}. Acordate de guardar los cambios.`,
          type: 'success',
        })
      } else {
        setMessage({
          text: '📸 Galería actualizada. Acordate de guardar los cambios.',
          type: 'success',
        })
      }
    } catch (error: any) {
      setMessage({ text: 'Error al subir algunas imágenes: ' + error.message, type: 'error' })
    } finally {
      setUploadingGallery(false)
      e.target.value = ''
    }
  }

  // --- ELIMINAR FOTO DE GALERÍA ---
  const handleRemoveImage = async (urlToRemove: string) => {
    const storagePath = getStoragePathFromUrl(urlToRemove)

    if (storagePath) {
      const { error } = await supabase.storage.from('peloteros').remove([storagePath])
      if (error) {
        console.error('Error al borrar la imagen del storage:', error.message)
      }
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

    setMessage({ text: '🗑️ Foto eliminada de la galería y del almacenamiento.', type: 'success' })
  }

  // --- ELIMINAR LOGO ---
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

    setMessage({ text: '🗑️ Logo eliminado del almacenamiento y del perfil.', type: 'success' })
  }

  // Guardar datos del Pelotero / Salón
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdatingProfile(true)
    setMessage(null)

    const {
      data: { session },
    } = await supabase.auth.getSession()

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

    // 1. Actualizar metadata del usuario en Supabase Auth
    const { error: authError } = await supabase.auth.updateUser({
      data: profilePayload,
    })

    // 2. Actualizar o insertar en la tabla 'profiles'
    const { error: dbError } = await supabase.from('profiles').upsert({
      id: userId,
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
    })

    setIsUpdatingProfile(false)

    if (authError || dbError) {
      setMessage({
        text: 'Error al actualizar los datos: ' + (authError?.message || dbError?.message),
        type: 'error',
      })
    } else {
      setMessage({
        text: '✨ ¡Información del salón actualizada con éxito!',
        type: 'success',
      })
    }
  }

  // Cambiar Contraseña
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (newPassword.length < 6) {
      setMessage({ text: 'La nueva contraseña debe tener al menos 6 caracteres.', type: 'error' })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ text: 'Las contraseñas ingresadas no coinciden.', type: 'error' })
      return
    }

    setIsUpdatingPassword(true)

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    setIsUpdatingPassword(false)

    if (error) {
      setMessage({ text: 'Error al cambiar la contraseña: ' + error.message, type: 'error' })
    } else {
      setMessage({ text: '🔒 ¡Contraseña modificada correctamente!', type: 'success' })
      setNewPassword('')
      setConfirmPassword('')
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
          Administra la información de tu salón y tus credenciales de acceso.
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

      {/* Formulario 1: Datos del Pelotero / Salón y Rol */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <h2 className="text-base font-black text-[#1F2937] border-b border-slate-100 pb-3">
          🏬 Datos del Pelotero / Salón
        </h2>

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          {/* Fila de Cuenta y Rol (Solo Lectura) */}
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
                <span className="text-xs">
                  {userRole === 'superAdmin' ? '👑' : '🏢'}
                </span>
                <span
                  className={`text-xs font-black ${
                    userRole === 'superAdmin' ? 'text-[#2563EB]' : 'text-slate-700'
                  }`}
                >
                  {userRole}
                </span>
              </div>
            </div>
          </div>

          {/* SECCIÓN MULTIMEDIA (LOGO Y GALERÍA) */}
          <div className="space-y-5 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-black uppercase text-[#0D9488] tracking-wider">
              🖼️ Logo y Galería de Fotos (Marketplace)
            </h3>

            {/* Subir / Mostrar Logo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Logo del Salón
              </label>
              <div className="flex items-center gap-4">
                <div 
                  onClick={() => logoUrl && setPreviewImage(logoUrl)}
                  className={`w-20 h-20 rounded-2xl bg-[#F3F4F6] border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 relative group ${logoUrl ? 'cursor-pointer hover:ring-2 hover:ring-teal-400' : ''}`}
                >
                  {logoUrl ? (
                    <>
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-white text-xs font-bold">🔍 Ver</span>
                      </div>
                    </>
                  ) : (
                    <span className="text-2xl">🎪</span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="cursor-pointer inline-flex items-center justify-center py-2 px-4 bg-slate-100 hover:bg-slate-200 text-[#1F2937] text-xs font-bold rounded-xl transition-all border border-slate-200">
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

            {/* Subir y Visualizar Galería */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700">
                  Galería del Pelotero ({gallery.length}/{MAX_GALLERY_IMAGES} {gallery.length === 1 ? 'imagen' : 'imágenes'})
                </label>
                {gallery.length >= MAX_GALLERY_IMAGES && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Límite máximo alcanzado
                  </span>
                )}
              </div>

              {/* Grilla interactiva de galería */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {gallery.map((url, index) => (
                  <div 
                    key={index} 
                    className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-[#F3F4F6] cursor-pointer shadow-sm hover:shadow-md transition-all"
                  >
                    <img 
                      src={url} 
                      alt={`Foto ${index + 1}`} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
                      onClick={() => setPreviewImage(url)}
                    />
                    
                    {/* Botón Eliminar */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveImage(url)
                      }}
                      className="absolute top-1.5 right-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-md transition-transform active:scale-95"
                      title="Eliminar foto"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {/* Botón para agregar fotos */}
                {gallery.length < MAX_GALLERY_IMAGES && (
                  <label className="aspect-square rounded-2xl border-2 border-dashed border-teal-200 hover:border-[#0D9488] bg-teal-50/40 hover:bg-teal-50 flex flex-col items-center justify-center text-[#0D9488] cursor-pointer transition-all p-2 text-center group">
                    <span className="text-xl font-bold group-hover:scale-110 transition-transform">
                      {uploadingGallery ? '⌛' : '+'}
                    </span>
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

          {/* Nombre Comercial y Teléfono / WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre del Pelotero / Salón *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Magic Kids Fun"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 bg-[#F3F4F6] border border-slate-200 rounded-xl text-xs font-semibold text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Teléfono de Contacto / WhatsApp
              </label>
              <input
                type="tel"
                placeholder="Ej: +54 9 297 1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-[#F3F4F6] border border-slate-200 rounded-xl text-xs font-semibold text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
              />
            </div>
          </div>

          {/* Dirección, Ciudad y Provincia */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Dirección / Calle
              </label>
              <input
                type="text"
                placeholder="Ej: Av. Rivadavia 1234"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-[#F3F4F6] border border-slate-200 rounded-xl text-xs font-semibold text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ciudad / Localidad
              </label>
              <input
                type="text"
                placeholder="Ej: Comodoro Rivadavia"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-[#F3F4F6] border border-slate-200 rounded-xl text-xs font-semibold text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Provincia
              </label>
              <input
                type="text"
                placeholder="Ej: Chubut"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full px-3 py-2 bg-[#F3F4F6] border border-slate-200 rounded-xl text-xs font-semibold text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
              />
            </div>
          </div>

          {/* SECCIÓN GOOGLE MAPS (ENLACE Y VISTA PREVIA) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                🗺️ Enlace de Google Maps / Ubicación
              </label>
              {mapUrl && (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-[#2563EB] hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                >
                  Probar enlace ↗
                </a>
              )}
            </div>

            <input
              type="text"
              placeholder="Ej: https://maps.google.com/?q=... o pega el código <iframe>"
              value={mapUrl}
              onChange={(e) => setMapUrl(e.target.value)}
              className="w-full px-3 py-2 bg-[#F3F4F6] border border-slate-200 rounded-xl text-xs font-semibold text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
            />
            <p className="text-[10px] text-slate-400 font-medium">
              💡 Para asegurar que la vista previa cargue correctamente, ve a Google Maps ➔ <strong>Compartir</strong> ➔ <strong>Incorporar un mapa</strong> y pega aquí el enlace o el código iframe.
            </p>

            {/* Vista Previa del Mapa */}
            {mapUrl ? (
              <div className="mt-2 rounded-2xl overflow-hidden border border-slate-200 bg-[#F3F4F6] shadow-inner h-48 w-full relative">
                <iframe
                  title="Vista previa de Google Maps"
                  src={getEmbedMapUrl(mapUrl)}
                  className="w-full h-full border-0"
                  loading="lazy"
                  allowFullScreen
                ></iframe>
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-dashed border-slate-200 bg-[#F3F4F6] text-center text-xs text-slate-400 font-medium">
                📍 Ingresa un enlace para ver la vista previa interactiva del mapa aquí.
              </div>
            )}
          </div>

          {/* Redes Sociales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Instagram (@usuario)
              </label>
              <input
                type="text"
                placeholder="Ej: @magickids.festejos"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="w-full px-3 py-2 bg-[#F3F4F6] border border-slate-200 rounded-xl text-xs font-semibold text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Facebook / Página
              </label>
              <input
                type="text"
                placeholder="Ej: /magickidsfestejos"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                className="w-full px-3 py-2 bg-[#F3F4F6] border border-slate-200 rounded-xl text-xs font-semibold text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="py-2.5 px-5 bg-[#0D9488] hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm shadow-teal-600/20 transition-all disabled:opacity-50 active:scale-[0.99]"
            >
              {isUpdatingProfile ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>

      {/* Formulario 2: Seguridad / Contraseña */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-black text-[#1F2937] border-b border-slate-100 pb-3">
          🔒 Seguridad y Contraseña
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nueva Contraseña
              </label>
              <input
                type="password"
                required
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[#F3F4F6] border border-slate-200 rounded-xl text-xs font-semibold text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Confirmar Nueva Contraseña
              </label>
              <input
                type="password"
                required
                placeholder="Repite la contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[#F3F4F6] border border-slate-200 rounded-xl text-xs font-semibold text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="py-2.5 px-5 bg-[#1F2937] hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50 active:scale-[0.99]"
            >
              {isUpdatingPassword ? 'Actualizando...' : 'Cambiar Contraseña'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal / Lightbox de Vista Previa de Imagen */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img 
              src={previewImage} 
              alt="Vista previa" 
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-4 -right-4 bg-white text-[#1F2937] rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shadow-lg hover:bg-slate-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}