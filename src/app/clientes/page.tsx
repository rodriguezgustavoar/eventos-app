import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'

export default async function ClientesPage() {
  // Inicializamos el cliente de Supabase asegurando las variables con !
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Consulta real a la tabla 'profiles' filtrando el rol 'user'
  const { data: clientes, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, phone, address, city, province, logo_url')
    .eq('role', 'user');

  if (error) {
    console.error('Error al cargar los clientes:', error.message);
  }

  const listaClientes = clientes || [];

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
            <Link href="/clientes" className="text-sm font-semibold text-blue-600 transition-colors">
              Clientes
            </Link>
            <Link href="/contacto" className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
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

      {/* Sección Principal de Clientes */}
      <main className="max-w-6xl mx-auto w-full px-6 my-12 space-y-10 flex-grow">
        
        {/* Título de la sección */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-[#0B2545]">
            Nuestros Clientes y Proveedores Registrados
          </h1>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">
            Encontrá salones, servicios de catering, animación y profesionales listos para tu próximo evento.
          </p>
        </div>

        {/* Mensaje por si no hay registros */}
        {listaClientes.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            No hay clientes registrados en este momento.
          </div>
        ) : (
          /* Grid de Tarjetas de Clientes */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listaClientes.map((cliente: any) => (
              <div 
                key={cliente.id}
                className="bg-white rounded-2xl overflow-hidden shadow-md shadow-slate-200/50 border border-slate-100 hover:border-pink-200 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Logo del Cliente */}
                  <div className="relative h-44 w-full bg-slate-50 p-4 flex items-center justify-center border-b border-slate-100">
                    {cliente.logo_url ? (
                      <Image
                        src={cliente.logo_url}
                        alt={cliente.full_name || 'Cliente'}
                        fill
                        className="object-contain p-2"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-slate-400">
                        Sin logo
                      </div>
                    )}
                  </div>

                  {/* Información del Cliente con texto en color oscuro */}
                  <div className="p-5 space-y-3">
                    <h3 className="font-bold text-[#0B2545] text-lg leading-snug">
                      {cliente.full_name || 'Sin nombre'}
                    </h3>
                    
                    <div className="space-y-2 text-xs text-slate-700 font-medium">
                      {cliente.address && (
                        <p className="flex items-center gap-2">
                          <span>📍</span> {cliente.address}
                        </p>
                      )}
                      
                      {/* Ciudad y Provincia */}
                      {(cliente.city || cliente.province) && (
                        <p className="flex items-center gap-2">
                          <span>🏙️</span> {
                            [cliente.city, cliente.province]
                              .filter(Boolean)
                              .join(', ')
                          }
                        </p>
                      )}

                      {cliente.phone && (
                        <p className="flex items-center gap-2">
                          <span>📞</span> {cliente.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botón de Contacto Rápido por WhatsApp */}
                {cliente.phone && (
                  <div className="p-5 pt-0">
                    <a
                      href={`https://wa.me/${cliente.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full block text-center py-2.5 bg-emerald-50 text-emerald-600 font-semibold rounded-xl text-xs hover:bg-emerald-100 transition-colors"
                    >
                      Contactar por WhatsApp
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </main>

      {/* Pie de página */}
      <footer className="w-full border-t border-slate-100 py-6 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} Festejamos. Todos los derechos reservados.</p>
      </footer>

    </div>
  )
}