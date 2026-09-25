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

interface FixedShift {
  id: string
  name: string
  start_time: string
  end_time: string
}

interface PricingScheme {
  id: string
  name: string
  days: string[]
  includes_holidays: boolean
  base_price: number
  extra_hour_price: number
  half_extra_hour_price: number
}

interface ShiftSettings {
  turn_buffer_minutes: number
  shift_duration_minutes: number
  allow_extra_hours: boolean
  fixed_shifts: FixedShift[]
  pricing_schemes: PricingScheme[]
}

const DAY_MAP: Record<number, string> = {
  0: 'dom',
  1: 'lun',
  2: 'mar',
  3: 'mie',
  4: 'jue',
  5: 'vie',
  6: 'sab',
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

  // Configuración de turnos y precios del salón
  const [shiftSettings, setShiftSettings] = useState<ShiftSettings | null>(null)
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null)
  const [isHoliday, setIsHoliday] = useState<boolean>(false)
  const [extraMinutes, setExtraMinutes] = useState<number>(0)
  const [currentSchemeName, setCurrentSchemeName] = useState<string>('')

  const supabase = createClient()

  useEffect(() => {
    loadInitialData()
  }, [bookingId, isNew])

  const loadInitialData = async () => {
    setLoading(true)
    setNotFound(false)

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('shift_settings, turn_buffer_minutes')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.shift_settings) {
        setShiftSettings(profile.shift_settings)
      }
    }

    if (!isNew) {
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
    }

    setLoading(false)
  }

  const timeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0
    const [hours, minutes] = timeStr.slice(0, 5).split(':').map(Number)
    return hours * 60 + minutes
  }

  const minutesToTime = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60) % 24
    const mins = totalMinutes % 60
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
  }

  const recalculateEventDetails = (
    dateStr: string,
    holidayFlag: boolean,
    shiftId: string | null,
    addedMinutes: number,
    manualStart?: string
  ) => {
    if (!shiftSettings || !shiftSettings.pricing_schemes || shiftSettings.pricing_schemes.length === 0) {
      return
    }

    let matchingScheme: PricingScheme | undefined

    if (holidayFlag) {
      matchingScheme = shiftSettings.pricing_schemes.find((s) => s.includes_holidays)
    }

    if (!matchingScheme && dateStr) {
      const [year, month, day] = dateStr.split('-').map(Number)
      const dateObj = new Date(year, month - 1, day)
      const dayCode = DAY_MAP[dateObj.getDay()]

      matchingScheme = shiftSettings.pricing_schemes.find((s) => s.days.includes(dayCode))
    }

    if (!matchingScheme) {
      matchingScheme = shiftSettings.pricing_schemes[0]
    }

    if (!matchingScheme) return

    setCurrentSchemeName(matchingScheme.name)
    const basePrice = Number(matchingScheme.base_price) || 0

    let targetStart = manualStart !== undefined ? manualStart : booking.start_time
    let targetEnd = booking.end_time

    if (shiftId && shiftSettings.fixed_shifts) {
      const shift = shiftSettings.fixed_shifts.find((s) => s.id === shiftId)
      if (shift) {
        targetStart = shift.start_time
        const baseShiftDuration = timeToMinutes(shift.end_time) - timeToMinutes(shift.start_time)
        const newEndMins = timeToMinutes(targetStart) + baseShiftDuration + addedMinutes
        targetEnd = minutesToTime(newEndMins)
      }
    } else if (manualStart !== undefined || addedMinutes >= 0) {
      const globalDuration = Number(shiftSettings.shift_duration_minutes) || 180
      if (targetStart) {
        const newEndMins = timeToMinutes(targetStart) + globalDuration + addedMinutes
        targetEnd = minutesToTime(newEndMins)
      }
    }

    const fullHours = Math.floor(addedMinutes / 60)
    const halfHours = Math.floor((addedMinutes % 60) / 30)

    const extraCost =
      (fullHours * (Number(matchingScheme.extra_hour_price) || 0)) +
      (halfHours * (Number(matchingScheme.half_extra_hour_price) || 0))

    const totalCalculated = basePrice + extraCost

    setBooking((prev) => ({
      ...prev,
      start_time: targetStart,
      end_time: targetEnd,
      total_price: totalCalculated > 0 ? totalCalculated : prev.total_price
    }))
  }

  const handleDateChange = (newDate: string) => {
    setBooking((prev) => ({ ...prev, event_date: newDate }))
    recalculateEventDetails(newDate, isHoliday, selectedShiftId, extraMinutes)
  }

  const handleHolidayToggle = (checked: boolean) => {
    setIsHoliday(checked)
    recalculateEventDetails(booking.event_date, checked, selectedShiftId, extraMinutes)
  }

  const handleSelectShift = (shift: FixedShift) => {
    setSelectedShiftId(shift.id)
    setExtraMinutes(0)
    recalculateEventDetails(booking.event_date, isHoliday, shift.id, 0, shift.start_time)
  }

  const handleExtraMinutesChange = (addedMins: number) => {
    setExtraMinutes(addedMins)
    recalculateEventDetails(booking.event_date, isHoliday, selectedShiftId, addedMins)
  }

  const handleStartTimeChange = (newStart: string) => {
    setSelectedShiftId(null)
    recalculateEventDetails(booking.event_date, isHoliday, null, extraMinutes, newStart)
  }

  const checkTimeOverlap = async (
    date: string, 
    startTime: string, 
    endTime: string, 
    userId: string, 
    currentId?: string
  ) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('turn_buffer_minutes')
      .eq('id', userId)
      .maybeSingle()

    const bufferMinutes = profile?.turn_buffer_minutes ?? 30

    let query = supabase
      .from('bookings')
      .select('id, start_time, end_time, child_name')
      .eq('event_date', date)
      .eq('profile_id', userId)

    if (currentId && currentId !== 'nuevo') {
      query = query.neq('id', currentId)
    }

    const { data: existingBookings, error } = await query

    if (error || !existingBookings || existingBookings.length === 0) {
      return { hasOverlap: false }
    }

    const newStartMins = timeToMinutes(startTime)
    const newEndMins = timeToMinutes(endTime)

    let conflictMessage = ''

    const hasConflict = existingBookings.some((b) => {
      const bStartMins = timeToMinutes(b.start_time)
      const bEndMins = timeToMinutes(b.end_time)

      const isOverlapping = newStartMins < (bEndMins + bufferMinutes) && bStartMins < (newEndMins + bufferMinutes)

      if (isOverlapping) {
        const busyRangeStr = `${b.start_time.slice(0, 5)} a ${b.end_time.slice(0, 5)} hs`
        const bufferInfoStr = bufferMinutes > 0 
          ? ` (se requieren ${bufferMinutes} min libres entre turnos)` 
          : ''

        conflictMessage = `Cumple de ${b.child_name} (${busyRangeStr})${bufferInfoStr}`
      }

      return isOverlapping
    })

    if (hasConflict) {
      return {
        hasOverlap: true,
        conflictDetails: conflictMessage,
      }
    }

    return { hasOverlap: false }
  }

  const handleSaveBooking = async (e: React.FormEvent) => {
    e.preventDefault()

    const startMins = timeToMinutes(booking.start_time)
    let endMins = timeToMinutes(booking.end_time)

    if (endMins <= startMins) {
      endMins += 24 * 60 
    }

    if (startMins >= endMins) {
      alert('La hora de fin debe ser posterior a la hora de inicio.')
      return
    }

    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setSaving(false)
      alert('No hay una sesión activa para asociar la reserva.')
      return
    }

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
        `⚠️ ¡Horario o tiempo libre entre turnos ocupado!\n\nExiste un conflicto con:\n• ${overlapCheck.conflictDetails}\n\nPor favor, elige otro horario que respete el tiempo de limpieza.`
      )
      return
    }

    const depositAmount = Number(booking.deposit_paid) || 0

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
      deposit_paid: depositAmount
    }

    if (isNew) {
      const { data, error } = await supabase
        .from('bookings')
        .insert([payload])
        .select()
        .single()

      if (error) {
        setSaving(false)
        alert('Error al crear el evento: ' + error.message)
        return
      }

      // Registro explícito del pago inicial en la tabla payments
      if (data && depositAmount > 0) {
        const { error: paymentError } = await supabase
          .from('payments')
          .insert([
            {
              booking_id: data.id,
              amount: depositAmount,
            }
          ])

        if (paymentError) {
          console.error('Error detallado al registrar el pago inicial en payments:', paymentError)
          alert('⚠️ El evento se creó, pero hubo un error al guardar el desglose en la tabla payments: ' + paymentError.message)
        }
      }

      setSaving(false)
      alert('🎉 ¡Evento creado con éxito!')
      window.open(`/evento/${data.id}`, '_blank')
      router.push('/admin')

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

          <form onSubmit={handleSaveBooking} className="space-y-5">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 space-y-3">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <label className="block text-xs font-bold text-gray-700">
                  📅 Fecha del Evento y Tarifas
                </label>

                <label className="inline-flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 shadow-sm">
                  <input
                    type="checkbox"
                    checked={isHoliday}
                    onChange={(e) => handleHolidayToggle(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  🎉 Es Día Feriado
                </label>
              </div>

              <input
                type="date"
                required
                value={booking.event_date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-semibold"
              />

              {currentSchemeName && (
                <p className="text-[11px] font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-100 flex items-center gap-1.5">
                  <span>💡 Tarifa detectada:</span>
                  <span className="underline">{currentSchemeName}</span>
                </p>
              )}
            </div>

            {shiftSettings && shiftSettings.fixed_shifts && shiftSettings.fixed_shifts.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">
                  📌 Seleccionar Turno Predefinido
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {shiftSettings.fixed_shifts.map((shift) => {
                    const isSelected = selectedShiftId === shift.id
                    return (
                      <button
                        key={shift.id}
                        type="button"
                        onClick={() => handleSelectShift(shift)}
                        className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-teal-600 text-white border-teal-600 shadow-md ring-2 ring-teal-200'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-xs font-black">{shift.name}</span>
                        <span className={`text-[11px] font-medium mt-1 ${isSelected ? 'text-teal-100' : 'text-gray-500'}`}>
                          ⏰ {shift.start_time} a {shift.end_time} hs
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {shiftSettings?.allow_extra_hours && (
              <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-100 space-y-2">
                <label className="block text-xs font-bold text-amber-900">
                  ⏳ Tiempo Extra Adicional (Extender Turno)
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[0, 30, 60, 90, 120, 180].map((mins) => {
                    const active = extraMinutes === mins
                    const label = 
                      mins === 0 ? 'Sin extra' :
                      mins === 30 ? '+ 30 min' :
                      mins === 60 ? '+ 1 hora' :
                      mins === 90 ? '+ 1h 30m' :
                      mins === 120 ? '+ 2 horas' : '+ 3 horas'

                    return (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => handleExtraMinutesChange(mins)}
                        className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                          active
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                            : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

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
                <label className="block text-xs font-bold text-gray-700 mb-1">Temática</label>
                <input
                  type="text"
                  value={booking.theme}
                  onChange={(e) => setBooking({ ...booking, theme: e.target.value })}
                  placeholder="Ej: Dinosaurios, Superhéroes..."
                  className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Hora Inicio</label>
                  <input
                    type="time"
                    required
                    value={booking.start_time}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-bold"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-gray-700">Hora Fin</label>
                    <span className="text-[9px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-100">
                      Auto
                    </span>
                  </div>
                  <input
                    type="time"
                    required
                    readOnly
                    value={booking.end_time}
                    className="w-full text-sm p-3 border border-teal-200 rounded-xl bg-teal-50/50 font-black text-teal-900 cursor-not-allowed shadow-inner"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-gray-700">Valor Total Calculado ($)</label>
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                    Automático
                  </span>
                </div>
                <input
                  type="number"
                  readOnly
                  value={booking.total_price}
                  placeholder="Se calcula automáticamente"
                  className="w-full text-sm p-3 border border-teal-200 rounded-xl bg-teal-50/50 font-black text-teal-900 cursor-not-allowed shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Seña Abonada ($)</label>
                <input
                  type="number"
                  value={booking.deposit_paid}
                  onChange={(e) => setBooking({ ...booking, deposit_paid: e.target.value })}
                  placeholder="Ej: 50000"
                  className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-bold text-teal-800"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-sm transition-all disabled:opacity-50 mt-2"
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