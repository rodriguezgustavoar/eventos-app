'use client'

import { use, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Booking {
  id?: string
  child_name: string
  child_age: number | string
  parent_name: string
  parent_phone: string
  event_date: string
  start_time: string
  end_time: string
  theme: string
  total_price: number | string
  deposit_paid: number | string
  profile_id?: string
}

interface RSVP {
  id: string
  guest_name: string
  adults_count: number
  children_count: number
  attending_count: number
  dietary_restrictions: string
  created_at: string
}

export default function PortalFamiliaPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const bookingId = resolvedParams.id
  const isNew = bookingId === 'nuevo'
  const router = useRouter()

  const [booking, setBooking] = useState<Booking>({
    child_name: '',
    child_age: '',
    parent_name: '',
    parent_phone: '',
    event_date: '',
    start_time: '',
    end_time: '',
    theme: '',
    total_price: '',
    deposit_paid: ''
  })

  const [rsvps, setRsvps] = useState<RSVP[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (!isNew) {
      fetchData()
    }
  }, [bookingId, isNew])

  const fetchData = async () => {
    setLoading(true)
    setNotFound(false)

    const { data: bookingData, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (error || !bookingData) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setBooking(bookingData)

    const { data: rsvpData } = await supabase
      .from('rsvps')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })

    if (rsvpData) {
      setRsvps(rsvpData)
    }

    setLoading(false)
  }

  // Verificar superposición de horarios dentro del mismo profile_id
  const checkTimeOverlap = async (date: string, startTime: string, endTime: string, userId: string, currentId?: string) => {
    let query = supabase
      .from('bookings')
      .select('id, start_time, end_time, child_name')
      .eq('event_date', date)
      .eq('profile_id', userId)

    if (currentId && currentId !== 'nuevo') {
      query = query.neq('id', currentId)
    }

    const { data: existingBookings, error } = await query

    if (error) {
      console.error('Error verificando disponibilidad:', error)
      return { hasOverlap: false }
    }

    if (!existingBookings || existingBookings.length === 0) {
      return { hasOverlap: false }
    }

    const conflictingBooking = existingBookings.find((b) => {
      const bStart = b.start_time.slice(0, 5)
      const bEnd = b.end_time.slice(0, 5)
      const newStart = startTime.slice(0, 5)
      const newEnd = endTime.slice(0, 5)

      return newStart < bEnd && newEnd > bStart
    })

    if (conflictingBooking) {
      return {
        hasOverlap: true,
        conflictingName: conflictingBooking.child_name,
        conflictingRange: `${conflictingBooking.start_time.slice(0, 5)} - ${conflictingBooking.end_time.slice(0, 5)}`
      }
    }

    return { hasOverlap: false }
  }

  // Guardar evento con validación
  const handleSaveBooking = async (e: React.FormEvent) => {
    e.preventDefault()

    if (booking.start_time >= booking.end_time) {
      alert('La hora de fin debe ser posterior a la hora de inicio.')
      return
    }

    setSaving(true)

    // 1. Obtener el usuario autenticado
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setSaving(false)
      alert('No hay una sesión activa para asociar la reserva.')
      console.error('No hay un usuario autenticado para asociar la reserva.')
      return
    }

    // 2. Verificación de superposición de horarios
    const overlapCheck = await checkTimeOverlap(
      booking.event_date,
      booking.start_time,
      booking.end_time,
      user.id,
      bookingId
    )

    if (overlapCheck.hasOverlap) {
      setSaving(false)
      alert(
        `⚠️ ¡Horario ocupado!\nYa existe una reserva para esa fecha en el rango ${overlapCheck.conflictingRange} (Cumple de ${overlapCheck.conflictingName}).`
      )
      return
    }

    // 3. Crear el payload con profile_id
    const payload = {
      profile_id: user.id,
      child_name: booking.child_name,
      child_age: Number(booking.child_age) || 0,
      parent_name: booking.parent_name,
      parent_phone: booking.parent_phone,
      event_date: booking.event_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      theme: booking.theme,
      total_price: Number(booking.total_price) || 0,
      deposit_paid: Number(booking.deposit_paid) || 0
    }

    if (isNew) {
      const { data, error } = await supabase
        .from('bookings')
        .insert([payload])
        .select()
        .single()

      setSaving(false)

      if (error) {
        alert('Error al crear el evento: ' + error.message)
      } else if (data) {
        alert('🎉 ¡Evento creado con éxito!')
        
        // Abre el nuevo evento en una pestaña nueva
        window.open(`/evento/${data.id}`, '_blank')
        
        // Redirige la pestaña actual a /admin
        router.push('/admin')
      }
    } else {
      const { error } = await supabase
        .from('bookings')
        .update(payload)
        .eq('id', bookingId)

      setSaving(false)

      if (error) {
        alert('Error al actualizar el evento: ' + error.message)
      } else {
        alert('¡Evento actualizado con éxito!')
      }
    }
  }

  const copyInvitationLink = () => {
    const link = `${window.location.origin}/invitacion/${bookingId}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <p className="text-gray-600 font-medium">Cargando panel de tu fiesta... 🎉</p>
      </div>
    )
  }

  if (!isNew && notFound) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl text-center max-w-sm border border-gray-200 shadow-sm space-y-4">
          <span className="text-4xl">❌</span>
          <h2 className="text-lg font-bold text-gray-800">Evento no encontrado</h2>
          <p className="text-xs text-gray-500">
            El ID del evento no existe o fue eliminado.
          </p>
          <Link
            href="/evento/nuevo"
            className="inline-block py-2 px-4 bg-teal-600 text-white font-bold text-xs rounded-xl hover:bg-teal-700 transition-colors"
          >
            ➕ Crear Nuevo Evento
          </Link>
        </div>
      </div>
    )
  }

  const totalAdults = rsvps.reduce((acc, curr) => acc + (curr.adults_count || 1), 0)
  const totalChildren = rsvps.reduce((acc, curr) => acc + (curr.children_count || 0), 0)
  const totalGuests = totalAdults + totalChildren

  const totalPriceNum = Number(booking.total_price) || 0
  const depositPaidNum = Number(booking.deposit_paid) || 0
  const pendingBalance = totalPriceNum - depositPaidNum

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 max-w-3xl mx-auto space-y-6 text-gray-800">
      
      {isNew ? (
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-6">
          <div>
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full uppercase tracking-wider border border-teal-100">
              Nuevo Evento
            </span>
            <h1 className="text-2xl font-black text-gray-800 mt-2">Crear Fiesta / Cumpleaños</h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Completa los datos de la fiesta y del responsable.
            </p>
          </div>

          <form onSubmit={handleSaveBooking} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nombre del Cumpleañero/a</label>
                <input
                  type="text"
                  required
                  value={booking.child_name}
                  onChange={(e) => setBooking({ ...booking, child_name: e.target.value })}
                  placeholder="Ej: Mateo"
                  className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Edad a Cumplir</label>
                <input
                  type="number"
                  required
                  value={booking.child_age}
                  onChange={(e) => setBooking({ ...booking, child_age: e.target.value })}
                  placeholder="Ej: 5"
                  className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nombre del Padre/Madre/Tutor</label>
                <input
                  type="text"
                  required
                  value={booking.parent_name}
                  onChange={(e) => setBooking({ ...booking, parent_name: e.target.value })}
                  placeholder="Ej: María González"
                  className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono de Contacto</label>
                <input
                  type="tel"
                  required
                  value={booking.parent_phone}
                  onChange={(e) => setBooking({ ...booking, parent_phone: e.target.value })}
                  placeholder="Ej: 2971234567"
                  className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Fecha del Evento</label>
                <input
                  type="date"
                  required
                  value={booking.event_date}
                  onChange={(e) => setBooking({ ...booking, event_date: e.target.value })}
                  className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Temática</label>
                <input
                  type="text"
                  value={booking.theme}
                  onChange={(e) => setBooking({ ...booking, theme: e.target.value })}
                  placeholder="Ej: Dinosaurios, Superhéroes..."
                  className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Hora Inicio</label>
                <input
                  type="time"
                  required
                  value={booking.start_time}
                  onChange={(e) => setBooking({ ...booking, start_time: e.target.value })}
                  className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Hora Fin</label>
                <input
                  type="time"
                  required
                  value={booking.end_time}
                  onChange={(e) => setBooking({ ...booking, end_time: e.target.value })}
                  className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Valor Total ($)</label>
                <input
                  type="number"
                  value={booking.total_price}
                  onChange={(e) => setBooking({ ...booking, total_price: e.target.value })}
                  placeholder="Ej: 150000"
                  className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Seña Abonada ($)</label>
                <input
                  type="number"
                  value={booking.deposit_paid}
                  onChange={(e) => setBooking({ ...booking, deposit_paid: e.target.value })}
                  placeholder="Ej: 50000"
                  className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {saving ? 'Verificando y Guardando...' : '🎉 Guardar y Crear Fiesta'}
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full uppercase tracking-wider border border-teal-100">
                  Mi Cumpleañero/a
                </span>
                <h1 className="text-2xl font-black text-gray-800 mt-2">
                  Cumple de {booking.child_name} ({booking.child_age} años)
                </h1>
                {booking.parent_name && (
                  <p className="text-xs text-gray-600 font-medium mt-0.5">
                    👤 Responsable: {booking.parent_name} {booking.parent_phone ? `| 📞 ${booking.parent_phone}` : ''}
                  </p>
                )}
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  📅 {booking.event_date} | ⏰ {booking.start_time?.slice(0, 5)} - {booking.end_time?.slice(0, 5)} hs
                </p>
                {booking.theme && (
                  <p className="text-xs text-teal-600 font-medium mt-1">
                    🎨 Temática: {booking.theme}
                  </p>
                )}
              </div>

              <button
                onClick={copyInvitationLink}
                className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
              >
                {copied ? '✅ ¡Link Copiado!' : '📲 Copiar Invitación Digital'}
              </button>
            </div>

            {(totalPriceNum > 0 || depositPaidNum > 0) && (
              <div className="pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-100 p-2.5 rounded-xl border border-gray-200">
                  <p className="text-[10px] text-gray-500 font-bold uppercase">Total Evento</p>
                  <p className="text-sm font-black text-gray-800">${totalPriceNum.toLocaleString()}</p>
                </div>
                <div className="bg-teal-50 p-2.5 rounded-xl border border-teal-100">
                  <p className="text-[10px] text-teal-700 font-bold uppercase">Seña Abonada</p>
                  <p className="text-sm font-black text-teal-800">${depositPaidNum.toLocaleString()}</p>
                </div>
                <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                  <p className="text-[10px] text-amber-700 font-bold uppercase">Saldo Restante</p>
                  <p className="text-sm font-black text-amber-900">${pendingBalance.toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl text-center">
              <p className="text-xs text-blue-600 font-bold uppercase">Total Invitados</p>
              <p className="text-3xl font-black text-blue-900 mt-1">{totalGuests}</p>
            </div>

            <div className="bg-teal-50 border border-teal-100 p-4 rounded-2xl text-center">
              <p className="text-xs text-teal-700 font-bold uppercase">👨‍👩‍👧 Adultos</p>
              <p className="text-3xl font-black text-teal-900 mt-1">{totalAdults}</p>
            </div>

            <div className="bg-slate-100 border border-slate-200 p-4 rounded-2xl text-center">
              <p className="text-xs text-slate-600 font-bold uppercase">🧒 Niños</p>
              <p className="text-3xl font-black text-slate-800 mt-1">{totalChildren}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-black text-gray-800 text-lg">Lista de Confirmados</h2>
              <span className="text-xs text-gray-400 font-medium">
                {rsvps.length} {rsvps.length === 1 ? 'familia' : 'familias'}
              </span>
            </div>

            {rsvps.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">
                Todavía nadie ha confirmado asistencia. Comparte el link por WhatsApp para empezar a recibir respuestas.
              </p>
            ) : (
              <div className="space-y-3">
                {rsvps.map((r) => (
                  <div key={r.id} className="p-4 bg-gray-100 rounded-2xl border border-gray-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-800 text-sm">{r.guest_name}</span>
                      <div className="flex gap-1.5">
                        <span className="bg-teal-100 text-teal-900 text-[11px] font-bold px-2 py-0.5 rounded-full">
                          👨‍👩‍👧 {r.adults_count || 1}
                        </span>
                        <span className="bg-blue-100 text-blue-900 text-[11px] font-bold px-2 py-0.5 rounded-full">
                          🧒 {r.children_count || 0}
                        </span>
                      </div>
                    </div>

                    {r.dietary_restrictions && (
                      <p className="text-xs text-amber-900 bg-amber-50 p-2 rounded-xl border border-amber-200 font-medium">
                        ⚠️ Restricción alimentaria: {r.dietary_restrictions}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}