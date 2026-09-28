'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function ContactoPage() {
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    mensaje: ''
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCargando(true);

    try {
      const response = await fetch("https://formspree.io/f/TU_ENDPOINT_AQUI", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setEnviado(true);
      } else {
        alert("Hubo un error al enviar el mensaje. Intentalo de nuevo.");
      }
    } catch (error) {
      console.error("Error de red:", error);
      alert("Ocurrió un error inesperado.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between antialiased">
      
      {/* BARRA DE MENÚ SUPERIOR */}
      <header className="w-full border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Logo a la izquierda */}
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="Festejamos Logo"
              width={160}
              height={55}
              className="object-contain"
              priority
            />
          </Link>

          {/* Opciones del menú a la derecha */}
          <nav className="flex items-center gap-8">
            <Link href="/" className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
              Inicio
            </Link>
            <Link href="/clientes" className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
              Clientes
            </Link>
            <Link href="/contacto" className="text-sm font-semibold text-blue-600 transition-colors">
              Contacto
            </Link>
            
            {/* Botón de Ingresar */}
            <Link
              href="/login"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-pink-500 text-white text-sm font-semibold rounded-xl hover:opacity-95 transition-all shadow-md shadow-pink-500/20 active:scale-[0.98]"
            >
              Ingresar
            </Link>
          </nav>

        </div>
      </header>

      {/* Sección Principal de Contacto */}
      <main className="max-w-5xl mx-auto w-full px-6 my-12 space-y-12 flex-grow">
        
        {/* Título de la sección */}
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h1 className="text-3xl font-extrabold text-[#0B2545]">
            ¿Tenés alguna duda o querés sumar tu salón/servicio?
          </h1>
          <p className="text-sm text-slate-500">
            Ponete en contacto con nuestro equipo y te responderemos a la brevedad.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          
          {/* Columna Izquierda: Información de Contacto */}
          <div className="bg-slate-50 border border-slate-100 p-8 rounded-3xl space-y-6">
            <h3 className="text-xl font-bold text-[#0B2545]">
              Información de contacto
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Estamos para ayudarte a potenciar tus eventos y coordinar cada detalle de forma simple y profesional.
            </p>

            <div className="space-y-4 text-sm text-slate-700 font-medium">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-base">📍</span>
                <span>Comodoro Rivadavia, Chubut, Argentina</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-base">📞</span>
                <span>+54 297 4604794</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-base">✉️</span>
                <span>festejamosweb@gmail.com</span>
              </div>
            </div>

            {/* Enlace directo a WhatsApp */}
            <div className="pt-2">
              <a
                href="https://wa.me/5492974604794"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-600 font-semibold rounded-xl text-xs hover:bg-emerald-100 transition-colors shadow-sm"
              >
                <span>💬</span> Chatear por WhatsApp ahora
              </a>
            </div>

            <div className="pt-4 border-t border-slate-200/60">
              <p className="text-xs text-slate-500">
                Horario de atención: Lunes a Viernes de 9:00 a 18:00 hs.
              </p>
            </div>
          </div>

          {/* Columna Derecha: Formulario de Contacto */}
          <div className="bg-white border border-slate-100 shadow-xl shadow-slate-200/50 p-8 rounded-3xl">
            {enviado ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-inner">
                  ✓
                </div>
                <h3 className="text-xl font-bold text-[#0B2545]">¡Mensaje enviado con éxito!</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Gracias por escribirnos a festejamosweb@gmail.com. Nos pondremos en contacto contigo a la brevedad.
                </p>
                <button
                  onClick={() => {
                    setEnviado(false);
                    setFormData({ nombre: '', email: '', telefono: '', mensaje: '' });
                  }}
                  className="mt-4 px-6 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-200 transition-colors"
                >
                  Enviar otro mensaje
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-xl font-bold text-[#0B2545] mb-2">
                  Envianos un mensaje
                </h3>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Nombre completo</label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej. Juan Pérez"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Correo electrónico</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="juan@correo.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="+54 9 ..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Mensaje o consulta</label>
                  <textarea
                    rows={4}
                    required
                    value={formData.mensaje}
                    onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                    placeholder="Escribinos tu consulta..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-pink-500 text-white font-semibold rounded-xl text-xs hover:opacity-95 transition-all shadow-md shadow-pink-500/20 active:scale-[0.98] disabled:opacity-50"
                >
                  {cargando ? 'Enviando...' : 'Enviar mensaje'}
                </button>
              </form>
            )}
          </div>

        </div>

      </main>

      {/* Pie de página */}
      <footer className="w-full border-t border-slate-100 py-6 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} Festejamos. Todos los derechos reservados.</p>
      </footer>

    </div>
  )
}