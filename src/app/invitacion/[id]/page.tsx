'use client'

import { use, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// --- COMPONENTE DE GLOBOS ANIMADOS (OPCIÓN 1) ---
interface Balloon {
  id: number
  left: number
  size: number
  color: string
  duration: number
  delay: number
}

const BALLOON_COLORS = [
  '#0D9488', // Teal
  '#F43F5E', // Rose
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#3B82F6', // Blue
  '#EC4899', // Pink
]

function BalloonEffect() {
  const [balloons, setBalloons] = useState<Balloon[]>([])

  useEffect(() => {
    // Inyectar estilos CSS para la animación floatUp dinámicamente
    const styleId = 'balloon-animation-styles'
    if (!document.getElementById(styleId)) {
      const styleTag = document.createElement('style')
      styleTag.id = styleId
      styleTag.innerHTML = `
        @keyframes floatUp {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: translateY(-60vh) rotate(8deg);
          }
          100% {
            transform: translateY(-120vh) rotate(-8deg);
            opacity: 0;
          }
        }
        .animate-float-up {
          animation-name: floatUp;
        }
      `
      document.head.appendChild(styleTag)
    }

    // Generar de 20 a 30 globos aleatorios
    const generatedBalloons: Balloon[] = Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      left: Math.random() * 90 + 5,
      size: Math.random() * 25 + 35,
      color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
      duration: Math.random() * 3 + 4,
      delay: Math.random() * 2,
    }))

    setBalloons(generatedBalloons)
  }, [])

  if (balloons.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {balloons.map((b) => (
        <div
          key={b.id}
          className="absolute bottom-[-100px] animate-float-up flex flex-col items-center"
          style={{
            left: `${b.left}%`,
            animationDuration: `${b.duration}s`,
            animationDelay: `${b.delay}s`,
            animationTimingFunction: 'ease-out',
            animationFillMode: 'forwards',
          }}
        >
          {/* Cuerpo del Globo */}
          <div
            className="rounded-full shadow-lg relative"
            style={{
              width: `${b.size}px`,
              height: `${b.size * 1.2}px`,
              backgroundColor: b.color,
            }}
          >
            {/* Brillo */}
            <div className="absolute top-2 left-2 w-2 h-4 bg-white/40 rounded-full -rotate-45" />

            {/* Nudo */}
            <div
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45"
              style={{ backgroundColor: b.color }}
            />
          </div>

          {/* Hilo */}
          <div className="w-[1px] h-12 bg-slate-400/60" />
        </div>
      ))}
    </div>
  )
}

// --- COMPONENTE PRINCIPAL ---
interface Booking {
  id: string
  child_name: string
  child_age: number
  event_date: string
  start_time: string
  end_time: string
  theme: string
  profiles?: {
    business_name?: string
    name?: string
    address?: string
    google_maps_url?: string
    logo_url?: string
    gallery?: string[]
  }
}

export default function InvitacionInvitadoPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const bookingId = resolvedParams.id

  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // Estado para el visor de pantalla completa (modal)
  const [fullscreenImageIndex, setFullscreenImageIndex] = useState<number | null>(null)

  // Referencia al contenedor de la galería
  const galleryRef = useRef<HTMLDivElement>(null)

  // Formulario RSVP
  const [guestName, setGuestName] = useState('')
  const [adultsCount, setAdultsCount] = useState(1)
  const [childrenCount, setChildrenCount] = useState(0)
  const [dietary, setDietary] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (bookingId) {
      fetchEventData()
    }
  }, [bookingId])

  // Soporte de navegación por teclado para el visor a pantalla completa
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (fullscreenImageIndex === null) return
      const galleryLength = booking?.profiles?.gallery?.length || 0

      if (e.key === 'Escape') {
        setFullscreenImageIndex(null)
      } else if (e.key === 'ArrowRight') {
        setFullscreenImageIndex((prev) => (prev !== null && prev < galleryLength - 1 ? prev + 1 : prev))
      } else if (e.key === 'ArrowLeft') {
        setFullscreenImageIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fullscreenImageIndex, booking])

  const fetchEventData = async () => {
    setLoading(true)

    const { data: bookingData, error } = await supabase
      .from('bookings')
      .select('*, profiles(*)')
      .eq('id', bookingId)
      .maybeSingle()

    if (error) {
      console.error('Error al cargar la reserva:', error.message)
    }

    if (bookingData) {
      setBooking(bookingData)
    }

    setLoading(false)
  }

  // Desplazar la galería con los botones < >
  const scrollGallery = (direction: 'prev' | 'next') => {
    if (!galleryRef.current) return
    const container = galleryRef.current
    const scrollAmount = container.clientWidth

    if (direction === 'next') {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    } else {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
    }
  }

  // Detectar el índice activo al hacer scroll
  const handleScroll = () => {
    if (!galleryRef.current) return
    const container = galleryRef.current
    const index = Math.round(container.scrollLeft / container.clientWidth)
    setCurrentImageIndex(index)
  }

  const handleRSVP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guestName.trim()) return

    setIsSubmitting(true)

    const totalAttending = adultsCount + childrenCount

    const { error } = await supabase.from('rsvps').insert([
      {
        booking_id: bookingId,
        guest_name: guestName,
        adults_count: adultsCount,
        children_count: childrenCount,
        attending_count: totalAttending,
        dietary_restrictions: dietary,
      },
    ])

    setIsSubmitting(false)

    if (!error) {
      setSubmitted(true)
    } else {
      alert('Error al confirmar asistencia: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-4">
        <p className="text-indigo-600 font-medium">Cargando invitación... 🎈</p>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl text-center max-w-sm border border-gray-200 shadow-sm space-y-2">
          <span className="text-4xl">❌</span>
          <h2 className="text-lg font-bold text-gray-800">Invitación no encontrada</h2>
          <p className="text-xs text-gray-500">
            El enlace puede estar caducado o el ID de la reserva es incorrecto.
          </p>
        </div>
      </div>
    )
  }

  const salonLogo = booking.profiles?.logo_url
  const salonGallery = booking.profiles?.gallery || []

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 p-4 flex justify-center items-center relative overflow-hidden">
      
      {/* Efecto de Globos al abrir la invitación */}
      <BalloonEffect />

      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-6 my-6 border border-white/40 z-10">
        
        {/* Logo del Pelotero */}
        {salonLogo && (
          <div className="flex justify-center -mb-2">
            <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
              <img
                src={salonLogo}
                alt="Logo del salón"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Encabezado Invitación */}
        <div className="text-center space-y-2">
          <span className="bg-purple-100 text-purple-700 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full">
            ¡Te invito a mi Cumple!
          </span>
          <h1 className="text-3xl font-black text-gray-900 mt-2">
            {booking.child_name} {booking.child_age ? `cumple ${booking.child_age}` : 'festeja!'} 🎉
          </h1>
          {booking.theme && (
            <p className="text-sm text-gray-600 font-medium">
              Temática: <span className="text-purple-600 font-bold">{booking.theme}</span>
            </p>
          )}
        </div>

        {/* Galería deslizable */}
        {salonGallery.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">
              📸 Conoce el lugar (Haz clic para ampliar)
            </p>

            <div className="relative group">
              {/* Botón Izquierda */}
              {salonGallery.length > 1 && currentImageIndex > 0 && (
                <button
                  type="button"
                  onClick={() => scrollGallery('prev')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/75 text-white p-2 rounded-full backdrop-blur-sm transition-all"
                  aria-label="Anterior"
                >
                  ❮
                </button>
              )}

              {/* Botón Derecha */}
              {salonGallery.length > 1 && currentImageIndex < salonGallery.length - 1 && (
                <button
                  type="button"
                  onClick={() => scrollGallery('next')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/75 text-white p-2 rounded-full backdrop-blur-sm transition-all"
                  aria-label="Siguiente"
                >
                  ❯
                </button>
              )}

              {/* Contenedor con Scroll Horizontal */}
              <div
                ref={galleryRef}
                onScroll={handleScroll}
                className="flex overflow-x-auto snap-x snap-mandatory rounded-2xl scrollbar-none scroll-smooth"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {salonGallery.map((imgUrl, index) => (
                  <div
                    key={index}
                    onClick={() => setFullscreenImageIndex(index)}
                    className="snap-center shrink-0 w-full h-52 overflow-hidden bg-gray-100 cursor-pointer relative group/item"
                  >
                    <img
                      src={imgUrl}
                      alt={`Imagen ${index + 1} del salón`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover/item:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm font-medium">
                        🔍 Ver pantalla completa
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Puntos (Dots) indicadores */}
              {salonGallery.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-2">
                  {salonGallery.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        currentImageIndex === idx
                          ? 'w-6 bg-purple-600'
                          : 'w-2 bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Pantalla Completa (Lightbox) */}
        {fullscreenImageIndex !== null && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setFullscreenImageIndex(null)}
          >
            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={() => setFullscreenImageIndex(null)}
              className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center text-xl z-20 backdrop-blur-sm transition-all"
              aria-label="Cerrar visor"
            >
              ✕
            </button>

            {/* Contador de Fotos */}
            <div className="absolute top-4 left-4 text-white/80 text-xs font-semibold bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
              {fullscreenImageIndex + 1} / {salonGallery.length}
            </div>

            {/* Botón Anterior Pantalla Completa */}
            {fullscreenImageIndex > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setFullscreenImageIndex((prev) => (prev !== null ? prev - 1 : 0))
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 p-3 rounded-full backdrop-blur-sm transition-all z-20 text-lg"
                aria-label="Imagen anterior"
              >
                ❮
              </button>
            )}

            {/* Imagen Principal */}
            <div
              className="relative max-w-4xl max-h-[85vh] w-full flex items-center justify-center overflow-hidden rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={salonGallery[fullscreenImageIndex]}
                alt={`Foto ${fullscreenImageIndex + 1} del salón`}
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              />
            </div>

            {/* Botón Siguiente Pantalla Completa */}
            {fullscreenImageIndex < salonGallery.length - 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setFullscreenImageIndex((prev) => (prev !== null ? prev + 1 : 0))
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 p-3 rounded-full backdrop-blur-sm transition-all z-20 text-lg"
                aria-label="Siguiente imagen"
              >
                ❯
              </button>
            )}
          </div>
        )}

        {/* Tarjeta de Fecha y Horario */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-2xl border border-purple-100 space-y-3">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">📅</span>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">Fecha</p>
              <p className="text-sm font-bold text-gray-800">{booking.event_date}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-2xl">⏰</span>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">Horario</p>
              <p className="text-sm font-bold text-gray-800">
                {booking.start_time?.slice(0, 5)} hs a {booking.end_time?.slice(0, 5)} hs
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-2xl">🏰</span>
            <div className="flex-1">
              <p className="text-xs text-gray-500 font-semibold uppercase">Lugar</p>
              <p className="text-sm font-bold text-gray-800">
                {booking.profiles?.business_name || booking.profiles?.name || 'Salón de Fiestas'}
              </p>
              {booking.profiles?.address && (
                <p className="text-xs text-gray-600">{booking.profiles.address}</p>
              )}
              {booking.profiles?.google_maps_url && (
                <a
                  href={booking.profiles.google_maps_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-purple-600 font-bold hover:underline mt-1 inline-block"
                >
                  📍 Ver cómo llegar en Google Maps ➔
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Formulario RSVP */}
        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
          <h3 className="font-bold text-gray-800 text-center text-base mb-3">
            ✍️ Confirmar Asistencia
          </h3>

          {submitted ? (
            <div className="text-center py-6 bg-green-50 border border-green-200 rounded-xl space-y-2">
              <span className="text-4xl">✅</span>
              <p className="text-green-800 font-bold text-base">¡Asistencia Confirmada!</p>
              <p className="text-xs text-green-600 max-w-xs mx-auto">
                Gracias {guestName}, registramos tu respuesta. ¡Nos vemos en la fiesta! 🎉
              </p>
            </div>
          ) : (
            <form onSubmit={handleRSVP} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre / Familia</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Familia Gómez"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">👨‍👩‍👧 Adultos</label>
                  <select
                    value={adultsCount}
                    onChange={(e) => setAdultsCount(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    {[0, 1, 2, 3, 4, 5, 6].map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'Adulto' : 'Adultos'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">🧒 Niños</label>
                  <select
                    value={childrenCount}
                    onChange={(e) => setChildrenCount(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    {[0, 1, 2, 3, 4, 5, 6].map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'Niño' : 'Niños'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Alergias / Restricciones Alimentarias
                </label>
                <input
                  type="text"
                  placeholder="Ej: 1 Celíaco, 1 Vegetariano"
                  value={dietary}
                  onChange={(e) => setDietary(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98]"
              >
                {isSubmitting ? 'Enviando...' : 'Confirmar Asistencia'}
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  )
}