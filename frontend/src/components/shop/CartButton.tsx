'use client';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/lib/cart';

export default function CartButton() {
  const { count, toggleCart } = useCartStore();
  const total = count();

  return (
    <button
      onClick={toggleCart}
      className="relative p-2 rounded-xl bg-[#F9E4E4] hover:bg-[#F0CCCC] transition-colors"
    >
      <ShoppingCart className="w-5 h-5 text-[#D4A574]" />
      {total > 0 && (
        <span className="absolute -top-1 -right-1 bg-[#D4A574] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
          {total}
        </span>
      )}
    </button>
  );
}
