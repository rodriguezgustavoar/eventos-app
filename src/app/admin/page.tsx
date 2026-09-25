'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AdminHeader from '@/components/AdminHeader'

interface Booking {
  id: string
  child_name?: string
  event_date: string
  start_time?: string
  end_time?: string
  status: string
  profile_id?: string
  
  // Montos
  total_price?: number
  price?: number
  deposit_paid?: number
  deposit?: number
  paid_amount?: number
}

interface Profile {
  id: string
  venue_name: string
  email: string
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function AdminDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [nextBookings, setNextBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string>('')

  // Estado del calendario (Mes y Año seleccionados)
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ dateStr: string; list: Booking[] } | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadAdminData()
  }, [])

  const loadAdminData = async () => {
    setLoading(true)

    // 1. Obtener usuario autenticado de auth.users
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const email = user.email || ''
    setUserEmail(email)

    // 2. Cargar perfil desde la tabla profiles
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .maybeSingle()

    const venueName = profileData?.full_name || user.user_metadata?.venue_name || user.user_metadata?.full_name || 'Mi Pelotero'

    setProfile({
      id: user.id,
      venue_name: venueName,
      email: email
    })

    // 3. Consultar reservas filtrando DIRECTAMENTE por profile_id con el ID del usuario
    const { data: bookingsData, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('profile_id', user.id)
      .order('event_date', { ascending: true })

    if (error) {
      console.error('Error al cargar reservas por profile_id:', error.message, error.details)
    }

    const finalBookings = bookingsData || []

    if (finalBookings.length > 0) {
      setBookings(finalBookings)

      const now = new Date()

      // Filtrar eventos futuros (comparando fecha y hora local)
      const futureEvents = finalBookings.filter((b) => {
        if (!b.event_date) return false

        const dateOnly = b.event_date.split('T')[0]
        const [year, month, day] = dateOnly.split('-').map(Number)

        const timePart = b.start_time ? b.start_time : '00:00'
        const [hours, minutes] = timePart.split(':').map(Number)

        const eventDateTime = new Date(year, month - 1, day, hours || 0, minutes || 0)

        return eventDateTime >= now
      })

      // Ordenar eventos cronológicamente
      futureEvents.sort((a, b) => {
        const dateA = a.event_date.split('T')[0]
        const timeA = a.start_time || '00:00'
        const dateB = b.event_date.split('T')[0]
        const timeB = b.start_time || '00:00'

        return `${dateA}T${timeA}`.localeCompare(`${dateB}T${timeB}`)
      })

      setNextBookings(futureEvents.slice(0, 5))
    } else {
      setBookings([])
      setNextBookings([])
    }

    setLoading(false)
  }

  // Helper para obtener lo abonado y lo pendiente
  const getFinancials = (b: Booking) => {
    const total = Number(b.total_price || b.price || 0)
    const paid = Number(b.deposit_paid || b.deposit || b.paid_amount || 0)
    const pending = Math.max(0, total - paid)
    return { total, paid, pending }
  }

  // --- LÓGICA DEL CALENDARIO Y MÉTRICAS MENSUALES ---
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Navegar entre meses
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
    setSelectedDayEvents(null)
  }
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
    setSelectedDayEvents(null)
  }

  // Mapa de eventos por fecha en formato YYYY-MM-DD
  const bookingsByDate: Record<string, Booking[]> = {}
  bookings.forEach((b) => {
    if (!b.event_date) return
    const dateKey = b.event_date.split('T')[0]
    if (!bookingsByDate[dateKey]) {
      bookingsByDate[dateKey] = []
    }
    bookingsByDate[dateKey].push(b)
  })

  // Ordenar los eventos de cada día cronológicamente (de más temprano a más tardío)
  Object.keys(bookingsByDate).forEach((dateKey) => {
    bookingsByDate[dateKey].sort((a, b) => {
      const timeA = a.start_time || '00:00'
      const timeB = b.start_time || '00:00'
      return timeA.localeCompare(timeB)
    })
  })

  // Días en el mes seleccionado
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayIndex = new Date(year, month, 1).getDay()

  // Filtrar reservas que pertenecen al mes visualizado
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthBookings = bookings.filter((b) => b.event_date && b.event_date.startsWith(monthPrefix))

  // Métricas financieras del MES seleccionado
  const monthTotalBookings = monthBookings.length
  const monthTotalCollected = monthBookings.reduce((acc, b) => acc + getFinancials(b).paid, 0)
  const monthTotalPending = monthBookings.reduce((acc, b) => acc + getFinancials(b).pending, 0)
  const monthTotalEstimated = monthBookings.reduce((acc, b) => acc + getFinancials(b).total, 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6] text-xs font-semibold text-[#1F2937]">
        Cargando panel de administración...
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 bg-[#F3F4F6] min-h-screen text-[#1F2937] antialiased">
      
      {/* Header */}
      <AdminHeader venueName={profile?.venue_name || 'Mi Pelotero'} adminEmail={userEmail} />

      {/* 1. Tabla de Próximos Eventos */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h2 className="font-bold text-[#1F2937] text-lg">Próximos Eventos</h2>
          <p className="text-xs text-slate-400 font-medium">Mostrando los 5 eventos más cercanos a la fecha actual</p>
        </div>

        {nextBookings.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">No hay próximos eventos agendados a partir de hoy.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-2">Evento / Agasajado/a</th>
                  <th className="py-3 px-2">Fecha</th>
                  <th className="py-3 px-2">Horario</th>
                  <th className="py-3 px-2">Abonado</th>
                  <th className="py-3 px-2">Pendiente</th>
                  <th className="py-3 px-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {nextBookings.map((b) => {
                  const eventName = b.child_name || 'Cumpleaños'
                  const { paid, pending } = getFinancials(b)

                  const timeRange = b.start_time && b.end_time 
                    ? `${b.start_time} a ${b.end_time} hs` 
                    : b.start_time 
                      ? `${b.start_time} hs` 
                      : '-'

                  return (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-2 font-bold text-[#1F2937]">{eventName}</td>
                      <td className="py-3 px-2 text-slate-600">{b.event_date}</td>
                      <td className="py-3 px-2 text-slate-600">{timeRange}</td>
                      <td className="py-3 px-2 font-semibold text-[#0D9488]">
                        ${paid.toLocaleString('es-AR')}
                      </td>
                      <td className="py-3 px-2 font-semibold text-amber-600">
                        ${pending.toLocaleString('es-AR')}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <a
                          href={`/evento/${b.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#2563EB] hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold transition-all text-[11px]"
                        >
                          Ver Evento ↗
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. Calendario + Informe Financiero del Mes Visualizado */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Lado Izquierdo: Calendario */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          
          {/* Header del Calendario */}
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-[#1F2937] text-base">
              {MONTH_NAMES[month]} {year}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 font-bold transition-all"
                title="Mes anterior"
              >
                ❮
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-2.5 py-1 text-xs font-semibold text-[#0D9488] hover:bg-teal-50 rounded-lg transition-all"
              >
                Hoy
              </button>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 font-bold transition-all"
                title="Mes siguiente"
              >
                ❯
              </button>
            </div>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {DAYS_OF_WEEK.map((day) => (
              <span key={day} className="text-[11px] font-bold text-slate-400 uppercase py-1">
                {day}
              </span>
            ))}
          </div>

          {/* Grilla de Días */}
          <div className="grid grid-cols-7 gap-1">
            {/* Casilleros vacíos del inicio */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-10" />
            ))}

            {/* Días del Mes */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1
              const dayStr = String(dayNum).padStart(2, '0')
              const monthStr = String(month + 1).padStart(2, '0')
              const fullDateStr = `${year}-${monthStr}-${dayStr}`

              const dayEvents = bookingsByDate[fullDateStr] || []
              const hasEvents = dayEvents.length > 0

              const isToday =
                new Date().getDate() === dayNum &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year

              return (
                <button
                  key={dayNum}
                  onClick={() => {
                    if (hasEvents) {
                      // Se pasa la lista ordenada por start_time
                      const sortedEvents = [...dayEvents].sort((a, b) => {
                        const timeA = a.start_time || '00:00'
                        const timeB = b.start_time || '00:00'
                        return timeA.localeCompare(timeB)
                      })
                      setSelectedDayEvents({ dateStr: fullDateStr, list: sortedEvents })
                    } else {
                      setSelectedDayEvents(null)
                    }
                  }}
                  className={`h-10 rounded-xl font-bold text-xs flex flex-col items-center justify-center relative transition-all ${
                    hasEvents
                      ? 'bg-[#0D9488] text-white shadow-md hover:bg-teal-700 ring-2 ring-teal-100'
                      : isToday
                      ? 'bg-teal-50 text-[#0D9488] border border-teal-300 font-extrabold'
                      : 'hover:bg-slate-100 text-[#1F2937]'
                  }`}
                >
                  <span>{dayNum}</span>
                  {hasEvents && (
                    <span className="text-[9px] font-semibold leading-none opacity-90">
                      {dayEvents.length} {dayEvents.length === 1 ? 'evt' : 'evts'}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Leyenda */}
          <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-[#0D9488] inline-block" />
              <span>Con eventos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-teal-50 border border-teal-300 inline-block" />
              <span>Hoy</span>
            </div>
          </div>

          {/* Desplegable de Eventos del Día Seleccionado (Ordenados de más temprano a más tardío) */}
          {selectedDayEvents && (
            <div className="mt-4 p-4 bg-teal-50/60 border border-teal-100 rounded-2xl space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold text-teal-900">
                  📅 Eventos del {selectedDayEvents.dateStr}:
                </p>
                <button
                  onClick={() => setSelectedDayEvents(null)}
                  className="text-xs text-teal-600 hover:text-teal-800 font-bold"
                >
                  ✕ Cerrar
                </button>
              </div>
              <div className="space-y-2">
                {selectedDayEvents.list.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 bg-white rounded-xl border border-teal-100 shadow-sm flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-[#1F2937]">{ev.child_name || 'Sin Nombre'}</p>
                      <p className="text-slate-500 text-[11px]">
                        ⏰ {ev.start_time?.slice(0, 5) || '--:--'} hs a {ev.end_time?.slice(0, 5) || '--:--'} hs
                      </p>
                    </div>
                    <a
                      href={`/evento/${ev.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#2563EB] hover:underline font-bold text-[11px]"
                    >
                      Ver Invitación ➔
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lado Derecho: Info y Métricas del Mes Seleccionado */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 h-full">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#0D9488] bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100">
                Balance Mensual
              </span>
              <h3 className="text-lg font-black text-[#1F2937] mt-2">
                {MONTH_NAMES[month]} {year}
              </h3>
              <p className="text-xs text-slate-400 font-medium">Resumen financiero de las reservas de este mes</p>
            </div>

            {/* Métrica 1: Total Reservas */}
            <div className="bg-[#F3F4F6] p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Total Reservas del Mes</p>
                <p className="text-2xl font-black text-[#1F2937] mt-0.5">{monthTotalBookings}</p>
              </div>
              <span className="text-3xl">📆</span>
            </div>

            {/* Métrica 2: Recaudado por Señas */}
            <div className="bg-teal-50/60 p-4 rounded-2xl border border-teal-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-teal-800">Recaudado por Señas</p>
                <p className="text-2xl font-black text-[#0D9488] mt-0.5">
                  ${monthTotalCollected.toLocaleString('es-AR')}
                </p>
              </div>
              <span className="text-3xl">💵</span>
            </div>

            {/* Métrica 3: Total a Cobrar */}
            <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-800">Total a Cobrar (Pendiente)</p>
                <p className="text-2xl font-black text-amber-600 mt-0.5">
                  ${monthTotalPending.toLocaleString('es-AR')}
                </p>
              </div>
              <span className="text-3xl">⏳</span>
            </div>

            {/* Total Pactado Estimado */}
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
              <span>Ingreso Total Estimado:</span>
              <span className="font-bold text-[#1F2937] text-sm">
                ${monthTotalEstimated.toLocaleString('es-AR')}
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}