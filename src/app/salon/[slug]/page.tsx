'use client'

import { useEffect, useState, use } from 'react'
import { createClient } from '@/lib/supabase/client'

interface SalonProfile {
  id: string
  full_name: string
  phone: string
  address: string
  city: string
  province: string
  google_maps_url: string
  instagram: string
  facebook: string
  logo_url: string
  gallery: string[]
  is_active: boolean
  shift_settings: {
    shift_duration_minutes: number
    turn_buffer_minutes: number
    fixed_shifts: Array<{ id: string; name: string; start_time: string; end_time: string }>
  }
}

export default function SalonPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)

  const [salon, setSalon] = useState<SalonProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [bookedIntervals, setBookedIntervals] = useState<Array<{ start: number; end: number }>>([])
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchSalonData()
  }, [slug])

  useEffect(() => {
    if (salon?.id) {
      handleSearchBookings()
    }
  }, [salon])

  const fetchSalonData = async () => {
    setLoading(true)

    // 1. Buscamos primero por slug exigiendo que is_active sea true
    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle()

    // 2. Si no lo encuentra por slug activo, intentamos buscar por id exigiendo también is_active = true
    if (!data) {
      const { data: dataById } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', slug)
        .eq('is_active', true)
        .maybeSingle()
      
      data = dataById
    }

    if (data) {
      setSalon(data)
    }
    setLoading(false)
  }

  // Convierte "HH:mm" a minutos totales desde las 00:00 para facilitar la comparación de rangos
  const timeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0
    const [hours, minutes] = timeStr.slice(0, 5).split(':').map(Number)
    return hours * 60 + minutes
  }

  const handleSearchBookings = async () => {
    if (!salon?.id) return
    setSearching(true)

    // Consultamos las reservas usando profile_id y la fecha seleccionada
    const { data } = await supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('profile_id', salon.id)
      .eq('event_date', selectedDate)

    if (data) {
      const intervals = data.map((b) => ({
        start: timeToMinutes(b.start_time),
        end: timeToMinutes(b.end_time),
      }))
      setBookedIntervals(intervals)
    } else {
      setBookedIntervals([])
    }

    setSearching(false)
  }

  // Genera el enlace externo seguro para abrir Google Maps
  const getExternalMapUrl = (salonData: SalonProfile) => {
    const rawUrl = salonData.google_maps_url ? salonData.google_maps_url.trim() : ''
    if (rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))) {
      return rawUrl
    }
    const fullAddress = [salonData.address, salonData.city, salonData.province]
      .filter(Boolean)
      .join(', ')

    if (!fullAddress) return 'https://maps.google.com'
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
  }

  // Función segura para formatear el número de WhatsApp
  const getWhatsAppUrl = (phone: string) => {
    if (!phone) return ''
    // Extraemos solo los dígitos del número cargado por el usuario
    const cleanDigits = phone.replace(/\D/g, '')
    // Si ya incluye el código de país (ej: 549...), lo dejamos; si no, aseguramos el prefijo si corresponde
    // Aquí asumimos que los números guardados ya tienen el formato correcto o les aseguramos el formato internacional si es necesario.
    return `https://wa.me/${cleanDigits}?text=Hola!%20Quería%20consultar%20disponibilidad%20para%20un%20evento.`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4">
        <p className="text-slate-600 font-medium text-xs">Cargando salón... 🎪</p>
      </div>
    )
  }

  if (!salon) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-3xl text-center space-y-2 border border-slate-200 shadow-sm">
          <h1 className="text-lg font-black text-slate-800">Salón no encontrado 🔍</h1>
          <p className="text-xs text-slate-500">El enlace ingresado no corresponde a ningún salón activo.</p>
        </div>
      </div>
    )
  }

  const fixedShifts = salon.shift_settings?.fixed_shifts || [
    { id: '1', name: 'Turno Tarde', start_time: '16:00', end_time: '19:00' },
  ]
  
  const bufferMinutes = salon.shift_settings?.turn_buffer_minutes || 0
  const mapUrl = getExternalMapUrl(salon)
  const fullAddressText = [salon.address, salon.city, salon.province].filter(Boolean).join(', ')
  const whatsappUrl = salon.phone ? getWhatsAppUrl(salon.phone) : ''

  return (
    <div className="min-h-screen bg-[#F3F4F6] p-4 md:p-8 max-w-4xl mx-auto space-y-6 text-[#1F2937] antialiased">
      {/* CABECERA CON LOGO Y DATOS */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
          {salon.logo_url ? (
            <img src={salon.logo_url} alt="Logo del salón" className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl">🎪</span>
          )}
        </div>
        <div className="space-y-2 text-center md:text-left flex-1">
          <span className="text-xs font-bold text-[#0D9488] bg-teal-50 px-3 py-1 rounded-full uppercase tracking-wider border border-teal-100 inline-block">
            Salón de Eventos
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-[#1F2937]">{salon.full_name || 'Mi Salón'}</h1>
          <p className="text-xs text-slate-500 font-medium">
            📍 {fullAddressText || 'Dirección no especificada'}
          </p>
          {whatsappUrl && (
            <div className="pt-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm transition-all"
              >
                <span>💬</span> Consultar por WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>

      {/* GALERÍA DE FOTOS */}
      {salon.gallery && salon.gallery.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#0D9488]">🖼️ Galería de Fotos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {salon.gallery.map((url, index) => (
              <div
                key={index}
                onClick={() => setPreviewImage(url)}
                className="aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer hover:opacity-90 transition-all"
              >
                <img src={url} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AGENDA Y TURNOS DISPONIBLES CON BOTÓN DE BÚSQUEDA */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-black text-[#1F2937]">📅 Agenda y Disponibilidad</h2>
            <p className="text-xs text-slate-500">Selecciona una fecha y presiona buscar para consultar los turnos.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2.5 bg-[#F3F4F6] border border-slate-200 rounded-xl text-xs font-bold text-[#1F2937]"
            />
            <button
              onClick={handleSearchBookings}
              disabled={searching}
              className="px-4 py-2.5 bg-[#0D9488] hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {searching ? 'Buscando...' : '🔍 Buscar'}
            </button>
          </div>
        </div>

        {/* Listado de Turnos Fijos con validación de solapamiento y buffer */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {fixedShifts.map((shift) => {
            const shiftStart = timeToMinutes(shift.start_time)
            const shiftEnd = timeToMinutes(shift.end_time)

            const isBooked = bookedIntervals.some((booking) => {
              const bufferedBookingStart = booking.start - bufferMinutes
              const bufferedBookingEnd = booking.end + bufferMinutes
              
              return shiftStart < bufferedBookingEnd && shiftEnd > bufferedBookingStart
            })

            return (
              <div
                key={shift.id}
                className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${
                  isBooked
                    ? 'bg-rose-50/50 border-rose-200 text-rose-900'
                    : 'bg-teal-50/50 border-teal-200 text-teal-900'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-black">{shift.name}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isBooked ? 'bg-rose-100 text-rose-700' : 'bg-teal-100 text-teal-700'
                    }`}
                  >
                    {isBooked ? '🔴 Ocupado' : '🟢 Disponible'}
                  </span>
                </div>
                <div className="text-xs font-medium">
                  🕒 {shift.start_time?.slice(0, 5)} a {shift.end_time?.slice(0, 5)} hs
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* SECCIÓN DE UBICACIÓN (TARJETA MODERNA CON ENLACE A GOOGLE MAPS) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-[#0D9488]">🗺️ Ubicación del Salón</h2>
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-sm font-bold text-slate-800">{salon.full_name}</p>
            <p className="text-xs text-slate-500">📍 {fullAddressText || 'Dirección no especificada'}</p>
          </div>
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all shrink-0 inline-flex items-center gap-2"
          >
            <span>🗺️</span> Abrir en Google Maps
          </a>
        </div>
      </div>

      {/* MODAL LIGHTBOX */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <img src={previewImage} alt="Ampliada" className="max-h-[85vh] max-w-full rounded-2xl border-4 border-white shadow-2xl" />
        </div>
      )}
    </div>
  )
}