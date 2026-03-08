/**
 * frontend/src/app/admin/layout.tsx
 */
'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Calendar, Scissors, Package, Users,
  ShoppingBag, MessageCircle, BarChart2, LogOut, Menu, X,
} from 'lucide-react';
import { tokenStorage } from '@/lib/api';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/citas', label: 'Citas', icon: Calendar },
  { href: '/admin/servicios', label: 'Servicios', icon: Scissors },
  { href: '/admin/productos', label: 'Productos', icon: Package },
  { href: '/admin/clientas', label: 'Clientas', icon: Users },
  { href: '/admin/ordenes', label: 'Órdenes', icon: ShoppingBag },
  { href: '/admin/whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { href: '/admin/reportes', label: 'Reportes', icon: BarChart2 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [usuario, setUsuario] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Si estamos en /admin/login, no verificar — dejar pasar
    if (pathname === '/admin/login') {
      setAuthed(true);
      return;
    }

    // Verificar que hay token en sessionStorage
    const token = tokenStorage.getAccess();
    if (!token) {
      router.replace('/admin/login');
      return;
    }

    // Token existe → mostrar contenido de inmediato
    // Intentar obtener usuario del token (sin llamada al backend)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUsuario(payload.username || '');
    } catch {
      // No crítico si falla el parse
    }
    setAuthed(true);
  }, [pathname]);

  const handleLogout = () => {
    tokenStorage.clear();
    router.replace('/admin/login');
  };

  // Solo mostrar spinner si no estamos en login y no hay auth
  if (!authed && pathname !== '/admin/login') {
    return (
      <div className="min-h-screen bg-[#FDF8F6] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#D4A574] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // En la página de login no mostrar el sidebar
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-[#FDF8F6]">

      {/* Overlay móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className={`
        fixed top-0 left-0 h-screen w-56 bg-[#4A3F32] flex flex-col z-40
        transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-[#6B5A45]">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-[#D4A574]" />
            <span className="font-display font-semibold text-white text-sm">Yalinnette Hair & Beauty Artist</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href ||
              (href !== '/admin' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${active
                    ? 'bg-[#D4A574] text-white'
                    : 'text-gray-300 hover:bg-[#6B5A45] hover:text-white'}
                `}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer sidebar */}
        <div className="px-3 py-4 border-t border-[#6B5A45]">
          {usuario && (
            <p className="text-xs text-gray-400 px-3 mb-2 truncate">
              👤 {usuario}
            </p>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-red-500/20 hover:text-red-300 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Contenido ─────────────────────────────────────────────────────── */}
      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">

        {/* Topbar móvil */}
        <div className="lg:hidden bg-white border-b border-rose-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-20 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-gray-100"
          >
            <Menu className="w-5 h-5 text-[#4A3F32]" />
          </button>
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-[#D4A574]" />
            <span className="font-display font-semibold text-[#4A3F32]">Yalinnette Hair & Beauty Artist</span>
          </div>
        </div>

        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}