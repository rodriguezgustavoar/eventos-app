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

export default function EditBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const bookingId = resolvedParams.id
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

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const [shiftSettings, setShiftSettings] = useState<ShiftSettings | null>(null)
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null)
  const [isHoliday, setIsHoliday] = useState<boolean>(false)
  const [extraMinutes, setExtraMinutes] = useState<number>(0)
  const [currentSchemeName, setCurrentSchemeName] = useState<string>('')

  const supabase = createClient()

  useEffect(() => {
    loadBookingAndSettings()
  }, [bookingId])

  const loadBookingAndSettings = async () => {
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

    if (currentId) {
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

  const handleUpdateBooking = async (e: React.FormEvent) => {
    e.preventDefault()

    const startMins = timeToMinutes(booking.start_time)
let endMins = timeToMinutes(booking.end_time)

// Si la hora de fin es menor o igual a la de inicio, asumimos que cruza la medianoche (día siguiente)
if (endMins <= startMins) {
  endMins += 24 * 60 // Se le suman 1440 minutos (24 horas)
}

if (startMins >= endMins) {
  alert('La hora de fin debe ser posterior a la hora de inicio.')
  return
}

    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setSaving(false)
      alert('No hay una sesión activa.')
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

    const payload = {
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

    const { error } = await supabase
      .from('bookings')
      .update(payload)
      .eq('id', bookingId)

    setSaving(false)

    if (error) {
      alert('Error al actualizar el evento: ' + error.message)
    } else {
      alert('✨ ¡Evento actualizado con éxito!')
      router.push(`/evento/${bookingId}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <p className="text-gray-600 font-medium">Cargando datos del evento... ⏳</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl text-center max-w-sm border border-gray-200 shadow-sm space-y-4">
          <span className="text-4xl">❌</span>
          <h2 className="text-lg font-bold text-gray-800">Evento no encontrado</h2>
          <Link
            href="/admin"
            className="inline-block py-2 px-4 bg-teal-600 text-white font-bold text-xs rounded-xl hover:bg-teal-700"
          >
            Volver al Panel
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 max-w-3xl mx-auto space-y-6 text-gray-800">
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full uppercase tracking-wider border border-amber-100">
              Modo Edición
            </span>
            <h1 className="text-2xl font-black text-gray-800 mt-2">Editar Fiesta de {booking.child_name}</h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Modifica la fecha, los horarios, horas extras o datos generales.
            </p>
          </div>
          <Link
            href={`/evento/${bookingId}`}
            className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
          >
            ← Volver al Panel
          </Link>
        </div>

        <form onSubmit={handleUpdateBooking} className="space-y-5">
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
                <span>💡 Tarifa aplicada:</span>
                <span className="underline">{currentSchemeName}</span>
              </p>
            )}
          </div>

          {shiftSettings && shiftSettings.fixed_shifts && shiftSettings.fixed_shifts.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">
                📌 Cambiar a Turno Predefinido
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
                className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Temática</label>
              <input
                type="text"
                value={booking.theme}
                onChange={(e) => setBooking({ ...booking, theme: e.target.value })}
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
                <label className="block text-xs font-bold text-gray-700">Valor Total Recalculado ($)</label>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                  Automático
                </span>
              </div>
              <input
                type="number"
                readOnly
                value={booking.total_price}
                className="w-full text-sm p-3 border border-teal-200 rounded-xl bg-teal-50/50 font-black text-teal-900 cursor-not-allowed shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Seña Abonada ($)</label>
              <input
                type="number"
                value={booking.deposit_paid}
                onChange={(e) => setBooking({ ...booking, deposit_paid: e.target.value })}
                className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-bold text-teal-800"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-sm transition-all disabled:opacity-50 mt-2"
          >
            {saving ? 'Verificando y Guardando...' : '💾 Guardar Cambios del Evento'}
          </button>
        </form>
      </div>
    </div>
  )
}