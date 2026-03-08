'use client';
import { X, Minus, Plus, ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/lib/cart';
import Link from 'next/link';

export default function CartDrawer() {
  const { items, isOpen, toggleCart, removeItem, updateQuantity, total } = useCartStore();

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={toggleCart} />
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col animate-fadeIn">
        <div className="flex items-center justify-between p-4 border-b border-rose-100">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#D4A574]" />
            <h2 className="font-semibold text-[#4A3F32]">Mi Carrito</h2>
          </div>
          <button onClick={toggleCart} className="p-1 rounded-lg hover:bg-[#F9E4E4]">
            <X className="w-5 h-5 text-[#8B7355]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12 text-[#8B7355]">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Tu carrito está vacío</p>
              <Link href="/tienda" onClick={toggleCart} className="text-[#D4A574] text-sm font-medium mt-2 inline-block">
                Ir a la tienda →
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 bg-[#FDF8F6] p-3 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#4A3F32] text-sm truncate">{item.nombre}</p>
                  <p className="text-[#D4A574] font-bold text-sm">${item.precio}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQuantity(item.id, item.cantidad - 1)}
                    className="w-7 h-7 rounded-lg bg-[#F9E4E4] hover:bg-[#F0CCCC] flex items-center justify-center">
                    <Minus className="w-3 h-3 text-[#4A3F32]" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">{item.cantidad}</span>
                  <button onClick={() => updateQuantity(item.id, item.cantidad + 1)}
                    className="w-7 h-7 rounded-lg bg-[#F9E4E4] hover:bg-[#F0CCCC] flex items-center justify-center">
                    <Plus className="w-3 h-3 text-[#4A3F32]" />
                  </button>
                  <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 ml-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-4 border-t border-rose-100">
            <div className="flex justify-between mb-4">
              <span className="font-semibold text-[#4A3F32]">Total:</span>
              <span className="font-bold text-[#D4A574] text-lg">${total().toFixed(2)}</span>
            </div>
            <Link href="/checkout" onClick={toggleCart}
              className="w-full bg-[#D4A574] hover:bg-[#C4956A] text-white py-3 rounded-xl font-semibold text-center block transition-colors shadow-md">
              Ir al Checkout
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
