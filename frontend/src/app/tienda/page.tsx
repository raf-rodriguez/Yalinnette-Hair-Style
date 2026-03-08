'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingCart, Search, ChevronLeft, Scissors, Package } from 'lucide-react';
import { api } from '@/lib/api';
import { useCartStore } from '@/lib/cart';
import CartDrawer from '@/components/shop/CartDrawer';
import CartButton from '@/components/shop/CartButton';

interface Producto {
  id: number; nombre: string; precio: number; descripcion: string;
  stock: number; categoria: string; imagen_url?: string; destacado: boolean;
}

export default function TiendaPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoria, setCategoria] = useState('');
  const [search, setSearch] = useState('');
  const [added, setAdded] = useState<number | null>(null);
  const { addItem } = useCartStore();

  // Cargar categorías dinámicas desde localStorage (mismas del admin)
  useEffect(() => {
    const saved = localStorage.getItem('beauty_categorias');
    if (saved) {
      try { setCategorias(JSON.parse(saved)); } catch { }
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    params.append('activo', 'true');
    if (categoria) params.append('categoria', categoria);
    api.getProductos(params.toString()).then((data) => {
      const lista: Producto[] = Array.isArray(data) ? data : data.results || [];
      setProductos(lista);

      // También sincronizar categorías desde los productos del backend
      setCategorias((prev) => {
        const fromDB = lista.map((p) => p.categoria).filter(Boolean);
        const merged = Array.from(new Set([...prev, ...fromDB]));
        // Solo actualizar localStorage si hay nuevas
        if (merged.length !== prev.length) {
          localStorage.setItem('beauty_categorias', JSON.stringify(merged));
        }
        return merged;
      });
    });
  }, [categoria]);

  const filtered = productos.filter((p) =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    p.descripcion.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = (p: Producto) => {
    addItem({ id: p.id, nombre: p.nombre, precio: p.precio, imagen_url: p.imagen_url });
    setAdded(p.id);
    setTimeout(() => setAdded(null), 1500);
  };

  return (
    <div className="min-h-screen bg-[#FDF8F6]">
      <CartDrawer />

      {/* Header */}
      <div className="bg-white border-b border-rose-100 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 rounded-xl hover:bg-[#F9E4E4]">
            <ChevronLeft className="w-5 h-5 text-[#8B7355]" />
          </Link>
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-[#D4A574]" />
            <span className="font-display text-lg font-semibold text-[#4A3F32]">Tienda</span>
          </div>
        </div>
        <CartButton />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Buscador */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7355]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
            placeholder="Buscar productos..."
          />
        </div>

        {/* Filtros de categoría — dinámicos */}
        {categorias.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
            {/* Botón "Todos" siempre primero */}
            <button
              onClick={() => setCategoria('')}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${categoria === ''
                  ? 'bg-[#D4A574] text-white shadow-sm'
                  : 'bg-white border border-rose-200 text-[#8B7355] hover:border-[#D4A574]'
                }`}>
              Todos
            </button>

            {categorias.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoria(cat)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all capitalize ${categoria === cat
                    ? 'bg-[#D4A574] text-white shadow-sm'
                    : 'bg-white border border-rose-200 text-[#8B7355] hover:border-[#D4A574]'
                  }`}>
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Grid de productos */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-[#8B7355]">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay productos disponibles</p>
            {categoria && (
              <button onClick={() => setCategoria('')} className="mt-3 text-sm text-[#D4A574] hover:underline">
                Ver todos los productos
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-rose-100 overflow-hidden hover:shadow-md transition-all">
                <div className="h-36 bg-gradient-to-br from-[#F9E4E4] to-[#F5E6D3] flex items-center justify-center relative">
                  <Package className="w-10 h-10 text-[#D4A574] opacity-40" />
                  {p.stock <= 3 && p.stock > 0 && (
                    <span className="absolute top-2 right-2 bg-orange-400 text-white text-xs px-2 py-0.5 rounded-full">¡Últimos!</span>
                  )}
                  {p.stock === 0 && (
                    <span className="absolute top-2 right-2 bg-gray-400 text-white text-xs px-2 py-0.5 rounded-full">Agotado</span>
                  )}
                  {p.categoria && (
                    <span className="absolute bottom-2 left-2 bg-white/80 text-[#8B7355] text-xs px-2 py-0.5 rounded-full capitalize">
                      {p.categoria}
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-[#4A3F32] text-sm leading-tight mb-1">{p.nombre}</h3>
                  <p className="text-[#8B7355] text-xs mb-3 line-clamp-2">{p.descripcion}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[#D4A574] font-bold">${p.precio}</span>
                    <button
                      disabled={p.stock === 0}
                      onClick={() => handleAdd(p)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${added === p.id
                          ? 'bg-green-500 text-white'
                          : p.stock === 0
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-[#D4A574] text-white hover:bg-[#C4956A]'
                        }`}>
                      {added === p.id ? '✓ Agregado' : <><ShoppingCart className="w-3 h-3" /> Agregar</>}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}