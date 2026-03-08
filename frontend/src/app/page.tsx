'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ShoppingCart, Calendar, Star, Phone, MapPin, Clock, ChevronRight, Scissors, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useCartStore } from '@/lib/cart';
import CartDrawer from '@/components/shop/CartDrawer';
import CartButton from '@/components/shop/CartButton';

interface Servicio { id: number; nombre: string; precio: number; duracion_minutos: number; descripcion: string; }
interface Producto { id: number; nombre: string; precio: number; descripcion: string; imagen_url?: string; destacado: boolean; }

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.118 1.527 5.847L0 24l6.345-1.499A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.774 9.774 0 01-5.036-1.394l-.361-.214-3.737.882.935-3.65-.235-.376A9.773 9.773 0 012.182 12C2.182 6.569 6.569 2.182 12 2.182S21.818 6.569 21.818 12 17.431 21.818 12 21.818z" />
    </svg>
  );
}

export default function HomePage() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const { addItem } = useCartStore();

  useEffect(() => {
    api.getServicios().then((data) => setServicios(Array.isArray(data) ? data : data.results || []));
    api.getProductos('destacado=true&activo=true').then((data) => {
      setProductos(Array.isArray(data) ? data : data.results || []);
    }).catch(() => { });
  }, []);

  const handleSeed = () => api.seedData().then(() => window.location.reload());

  return (
    <div className="min-h-screen bg-[#FDF8F6]">
      <CartDrawer />

      {/* ── Botón flotante WhatsApp ── */}
      <a
        href="https://wa.me/17877187189"
        target="_blank"
        rel="noreferrer"
        aria-label="Contáctanos por WhatsApp"
        className="fixed bottom-6 right-6 z-50 group"
      >
        {/* Tooltip */}
        <span className="absolute bottom-16 right-0 bg-[#4A3F32] text-white text-xs px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap shadow-lg pointer-events-none">
          💬 Escríbenos por WhatsApp
        </span>
        {/* Círculo verde */}
        <div className="w-14 h-14 bg-[#25D366] hover:bg-[#1ebe57] rounded-full shadow-xl flex items-center justify-center transition-all transform hover:scale-110 whatsapp-pulse">
          <WhatsAppIcon className="w-8 h-8 text-white" />
        </div>
      </a>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-rose-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-6 h-6 text-[#D4A574]" />
            <span className="font-display text-xl font-semibold text-[#4A3F32]">Yalinnette Hair & Beauty Artist</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-[#8B7355]">
            <a href="#servicios" className="hover:text-[#D4A574] transition-colors">Servicios</a>
            <a href="#productos" className="hover:text-[#D4A574] transition-colors">Productos</a>
            <a href="#contacto" className="hover:text-[#D4A574] transition-colors">Contacto</a>
          </nav>
          <div className="flex items-center gap-2">
            <CartButton />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#F9E4E4] via-[#FDF8F6] to-[#F5E6D3] py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-[#D4A574] blur-3xl" />
          <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full bg-[#F9E4E4] blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/80 px-4 py-1.5 rounded-full text-[#D4A574] text-sm font-medium mb-6 shadow-sm">
            <Sparkles className="w-4 h-4" />
            Yalinnette Hair & Beauty Artist & Salón de Belleza Profesional
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-bold text-[#4A3F32] mb-4 leading-tight">
            Tu Belleza,<br />
            <span className="text-[#D4A574]">Nuestro Arte</span>
          </h1>
          <p className="text-[#8B7355] text-lg mb-8 max-w-md mx-auto">
            Caguas, Puerto Rico · Martes a Sábado 9AM–6PM
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-sm mx-auto sm:max-w-none">
            <Link href="/booking"
              className="flex items-center justify-center gap-2 bg-[#D4A574] hover:bg-[#C4956A] text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5">
              <Calendar className="w-5 h-5" />
              Agendar Cita
            </Link>
            <Link href="/tienda"
              className="flex items-center justify-center gap-2 bg-white hover:bg-[#F9E4E4] text-[#4A3F32] border-2 border-[#D4A574] px-8 py-4 rounded-2xl font-semibold text-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5">
              <ShoppingCart className="w-5 h-5" />
              Ver Productos
            </Link>
          </div>
          {/* WhatsApp CTA secundario */}
          <div className="mt-5">
            <a href="https://wa.me/17877187189" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 text-[#8B7355] hover:text-[#25D366] text-sm transition-colors group">
              <div className="w-5 h-5 bg-[#25D366] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <WhatsAppIcon className="w-3 h-3 text-white" />
              </div>
              También puedes agendar directo por WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Servicios */}
      <section id="servicios" className="py-16 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl font-bold text-[#4A3F32] mb-2">Nuestros Servicios</h2>
          <p className="text-[#8B7355]">Tratamientos de belleza profesional a tu disposición</p>
        </div>
        {servicios.length === 0 && (
          <div className="text-center py-8">
            <p className="text-[#8B7355] mb-4">No hay servicios cargados aún.</p>
            <button onClick={handleSeed} className="bg-[#D4A574] text-white px-6 py-2 rounded-xl hover:bg-[#C4956A]">
              Cargar datos de ejemplo
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {servicios.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border border-rose-100 group">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-[#4A3F32] text-lg">{s.nombre}</h3>
                <span className="bg-[#F9E4E4] text-[#D4A574] font-bold px-3 py-1 rounded-full text-sm">${s.precio}</span>
              </div>
              <p className="text-[#8B7355] text-sm mb-3">{s.descripcion}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#B8856A] flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {s.duracion_minutos} min
                </span>
                <Link href={`/booking?servicio=${s.id}`}
                  className="text-[#D4A574] text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                  Reservar <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link href="/booking" className="inline-flex items-center gap-2 bg-[#D4A574] text-white px-8 py-3 rounded-2xl font-semibold hover:bg-[#C4956A] transition-colors shadow-md">
            <Calendar className="w-5 h-5" /> Agendar Mi Cita
          </Link>
        </div>
      </section>

      {/* Productos */}
      <section id="productos" className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold text-[#4A3F32] mb-2">Productos Destacados</h2>
            <p className="text-[#8B7355]">Los mejores productos de belleza para ti</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {productos.map((p) => (
              <div key={p.id} className="bg-[#FDF8F6] rounded-2xl p-4 border border-rose-100 hover:shadow-md transition-all">
                <div className="h-28 bg-gradient-to-br from-[#F9E4E4] to-[#F5E6D3] rounded-xl mb-3 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-[#D4A574] opacity-50" />
                </div>
                <h3 className="font-semibold text-[#4A3F32] text-sm mb-1">{p.nombre}</h3>
                <p className="text-[#8B7355] text-xs mb-3 line-clamp-2">{p.descripcion}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[#D4A574] font-bold">${p.precio}</span>
                  <button
                    onClick={() => addItem({ id: p.id, nombre: p.nombre, precio: p.precio, imagen_url: p.imagen_url })}
                    className="bg-[#D4A574] text-white text-xs px-3 py-1.5 rounded-lg hover:bg-[#C4956A] transition-colors flex items-center gap-1">
                    <ShoppingCart className="w-3 h-3" /> Agregar
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/tienda" className="inline-flex items-center gap-2 bg-white border-2 border-[#D4A574] text-[#D4A574] px-8 py-3 rounded-2xl font-semibold hover:bg-[#F9E4E4] transition-colors">
              Ver Todos los Productos <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonios */}
      <section className="py-16 px-4 bg-[#F9E4E4]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold text-[#4A3F32] mb-2">Lo Que Dicen Nuestras Clientas</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { nombre: 'María G.', texto: 'Excelente servicio, siempre salgo feliz. Las uñas me quedan perfectas.', stars: 5 },
              { nombre: 'Carmen R.', texto: 'El mejor salón de Caguas. Muy profesional y el ambiente es súper relajante.', stars: 5 },
              { nombre: 'Luz M.', texto: 'Me encanta el sistema de reservas online, es muy fácil y conveniente.', stars: 5 },
            ].map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex gap-1 mb-3">
                  {[...Array(t.stars)].map((_, j) => <Star key={j} className="w-4 h-4 fill-[#D4A574] text-[#D4A574]" />)}
                </div>
                <p className="text-[#4A3F32] mb-4 italic">"{t.texto}"</p>
                <p className="text-[#D4A574] font-semibold text-sm">{t.nombre}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contacto */}
      <section id="contacto" className="py-16 px-4 bg-[#4A3F32] text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Scissors className="w-6 h-6 text-[#D4A574]" />
                <span className="font-display text-xl font-semibold">Yalinnette Hair & Beauty Artist</span>
              </div>
              <p className="text-[#C4956A] text-sm">Tu Estilista de confianza en Caguas, Puerto Rico.</p>
            </div>
            <div>
              <h3 className="font-semibold text-[#D4A574] mb-4">Contacto</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <a href="tel:7877187189" className="flex items-center gap-2 hover:text-[#D4A574] transition-colors">
                  <Phone className="w-4 h-4 text-[#D4A574]" /> 787-718-7189
                </a>
                <a href="https://wa.me/17877187189" target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 hover:text-[#25D366] transition-colors">
                  <div className="w-4 h-4 bg-[#25D366] rounded-full flex items-center justify-center flex-shrink-0">
                    <WhatsAppIcon className="w-2.5 h-2.5 text-white" />
                  </div>
                  WhatsApp — Agendar cita
                </a>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#D4A574]" /> Caguas, Puerto Rico
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-[#D4A574] mb-4">Horario</h3>
              <div className="text-sm text-gray-300 space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#D4A574]" />
                  <span>Martes a Sábado</span>
                </div>
                <p className="ml-6">9:00 AM – 6:00 PM</p>
                <p className="text-[#888] text-xs mt-2">Lunes y Domingo: Cerrado</p>
              </div>
            </div>
          </div>
          <div className="border-t border-[#6B5A45] mt-10 pt-6 text-center text-xs text-[#888]">
            © {new Date().getFullYear()} Yalinnette Hair & Beauty Artist · Caguas, Puerto Rico
          </div>
        </div>
      </section>
    </div>
  );
}