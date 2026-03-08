'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ShoppingBag, User, CreditCard, CheckCircle, Lock, Loader2 } from 'lucide-react';
import { useCartStore } from '@/lib/cart';
import StripePaymentForm, { PagoExitoso } from '@/components/StripePaymentForm';

const STEPS = ['Tu pedido', 'Datos', 'Pago', 'Confirmación'];
type MetodoPago = 'athmovil' | 'paypal' | 'tarjeta' | null;

// ── Íconos SVG de cada método ────────────────────────────────────────────────
function ATHIcon() {
  return (
    <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
      <span className="text-white font-black text-sm tracking-tight">ATH</span>
    </div>
  );
}
function PayPalIcon() {
  return (
    <div className="w-12 h-12 bg-[#003087] rounded-xl flex items-center justify-center flex-shrink-0">
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="white">
        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 4.643-5.813 4.643h-2.19a.764.764 0 0 0-.754.648l-1.34 8.487-.38 2.408a.38.38 0 0 0 .376.44h3.317c.458 0 .85-.334.92-.785l.038-.196.733-4.646.047-.256a.932.932 0 0 1 .92-.785h.58c3.755 0 6.694-1.525 7.552-5.936.358-1.845.173-3.386-.758-4.535z"/>
      </svg>
    </div>
  );
}
function CardIcon() {
  return (
    <div className="w-12 h-12 bg-[#1a1a2e] rounded-xl flex items-center justify-center flex-shrink-0">
      <CreditCard className="w-6 h-6 text-white" />
    </div>
  );
}

export default function CheckoutPage() {
  const { items, total, clearCart } = useCartStore();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '' });
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(null);
  const [clientSecret, setClientSecret] = useState('');
  const [ordenData, setOrdenData] = useState<any>(null);
  const [pagoExitoso, setPagoExitoso] = useState<any>(null);
  const [referencia, setReferencia] = useState('');
  const [refEnviada, setRefEnviada] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cartItems = items;
  const cartTotal = total();

  if (cartItems.length === 0 && step === 0) {
    return (
      <div className="min-h-screen bg-[#FDF8F6] flex flex-col items-center justify-center gap-4 px-4">
        <ShoppingBag className="w-16 h-16 text-[#D4A574] opacity-40" />
        <p className="text-[#4A3F32] font-semibold text-lg">Tu carrito está vacío</p>
        <Link href="/tienda" className="bg-[#D4A574] text-white px-6 py-3 rounded-2xl font-semibold">
          Ver productos
        </Link>
      </div>
    );
  }

  // Crear orden y PaymentIntent solo para tarjeta
  const handleIrAPago = async () => {
    if (!form.nombre || !form.telefono) {
      setError('Nombre y teléfono son requeridos.');
      return;
    }
    if (!metodoPago) {
      setError('Selecciona un método de pago.');
      return;
    }

    // ATH Móvil y PayPal van directo sin crear PaymentIntent
    if (metodoPago === 'athmovil' || metodoPago === 'paypal') {
      setStep(2);
      return;
    }

    // Tarjeta → crear PaymentIntent en Stripe
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stripe/payment-intent/orden/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre,
          telefono: form.telefono,
          email: form.email,
          items: cartItems.map((i) => ({ producto_id: i.id, cantidad: i.cantidad })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al preparar el pago');
      setClientSecret(data.client_secret);
      setOrdenData(data);
      setStep(2);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePagoExitoso = async (paymentIntentId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stripe/confirmar/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_intent_id: paymentIntentId, tipo: 'orden' }),
      });
      const data = await res.json();
      if (data.success) {
        setPagoExitoso(data);
        clearCart();
        setStep(3);
      }
    } catch (e) { console.error(e); }
  };

  const handleConfirmarManual = async () => {
    if (!referencia.trim()) {
      setError('Ingresa tu número de referencia o confirmación.');
      return;
    }
    setLoading(true);
    try {
      // Crear orden manualmente para ATH/PayPal
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ordenes/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_cliente: form.nombre,
          telefono_cliente: form.telefono,
          email_cliente: form.email,
          metodo_pago: metodoPago,
          referencia_pago: referencia,
          items: cartItems.map((i) => ({ producto_id: i.id, cantidad: i.cantidad, precio_unit: i.precio })),
        }),
      });
      const data = await res.json();
      setPagoExitoso({ success: true, orden_id: data.id, nombre: form.nombre, total: cartTotal });
      clearCart();
      setStep(3);
    } catch (e: any) {
      setError('Error al registrar el pago. Contáctanos al 787-718-7189.');
    } finally {
      setLoading(false);
    }
  };

  // Deep link ATH Móvil
  const athMovilUrl = `athm://pay?phone=7877187189&amount=${cartTotal.toFixed(2)}&memo=Orden Beauty Salon - ${form.nombre}`;
  const paypalUrl = `https://paypal.me/BeautySalonPR/${cartTotal.toFixed(2)}`;

  return (
    <div className="min-h-screen bg-[#FDF8F6] pb-10">
      {/* Header */}
      <div className="bg-white border-b border-rose-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => step > 0 ? setStep(step - 1) : null} className="p-2 rounded-xl hover:bg-[#F9E4E4]">
          {step > 0 ? <ChevronLeft className="w-5 h-5 text-[#8B7355]" /> : (
            <Link href="/tienda"><ChevronLeft className="w-5 h-5 text-[#8B7355]" /></Link>
          )}
        </button>
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-[#D4A574]" />
          <span className="font-display text-lg font-semibold text-[#4A3F32]">Checkout</span>
        </div>
      </div>

      {/* Stepper */}
      {step < 3 && (
        <div className="bg-white border-b border-rose-100 px-4 py-3">
          <div className="flex items-center max-w-lg mx-auto">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                    ${i < step ? 'bg-[#D4A574] text-white' : i === step ? 'bg-[#4A3F32] text-white' : 'bg-gray-200 text-gray-400'}`}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs mt-1 hidden sm:block whitespace-nowrap ${i === step ? 'text-[#4A3F32] font-medium' : 'text-gray-400'}`}>{s}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 mx-1 ${i < step ? 'bg-[#D4A574]' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 pt-6">

        {/* ── PASO 0: Resumen del pedido ── */}
        {step === 0 && (
          <div>
            <h2 className="font-display text-xl font-bold text-[#4A3F32] mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#D4A574]" /> Tu pedido
            </h2>
            <div className="bg-white rounded-2xl border border-rose-100 divide-y divide-rose-50 overflow-hidden">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-[#4A3F32] text-sm">{item.nombre}</p>
                    <p className="text-[#8B7355] text-xs">${item.precio} × {item.cantidad}</p>
                  </div>
                  <span className="font-bold text-[#D4A574]">${(item.precio * item.cantidad).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-4 bg-[#F9E4E4]">
                <span className="font-bold text-[#4A3F32]">Total</span>
                <span className="text-2xl font-bold text-[#D4A574]">${cartTotal.toFixed(2)}</span>
              </div>
            </div>
            <button onClick={() => setStep(1)}
              className="mt-4 w-full bg-[#D4A574] text-white py-3.5 rounded-2xl font-semibold hover:bg-[#C4956A] transition-colors">
              Continuar →
            </button>
          </div>
        )}

        {/* ── PASO 1: Datos + Método de pago ── */}
        {step === 1 && (
          <div>
            <h2 className="font-display text-xl font-bold text-[#4A3F32] mb-1 flex items-center gap-2">
              <User className="w-5 h-5 text-[#D4A574]" /> Tus datos
            </h2>
            <p className="text-[#8B7355] text-sm mb-5">Para procesar tu pedido</p>

            <div className="space-y-4 mb-6">
              {[
                { key: 'nombre', label: 'Nombre completo *', placeholder: 'María López', type: 'text' },
                { key: 'telefono', label: 'Teléfono *', placeholder: '787-123-4567', type: 'tel' },
                { key: 'email', label: 'Email (para recibo)', placeholder: 'tu@email.com', type: 'email' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-[#4A3F32] mb-1">{label}</label>
                  <input type={type} value={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A574] bg-white" />
                </div>
              ))}
            </div>

            {/* Selector de método de pago — igual que Base44 */}
            <div className="mb-2">
              <p className="font-semibold text-[#4A3F32] mb-1">Selecciona tu método de pago</p>
              <p className="text-sm text-[#8B7355] mb-4">Total a pagar: <span className="font-bold text-[#D4A574]">${cartTotal.toFixed(2)}</span></p>
            </div>

            <div className="space-y-3">
              {/* ATH Móvil */}
              <button onClick={() => setMetodoPago('athmovil')}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                  metodoPago === 'athmovil' ? 'border-red-400 bg-red-50' : 'border-gray-100 bg-white hover:border-red-200'}`}>
                <ATHIcon />
                <div className="flex-1">
                  <p className="font-semibold text-[#4A3F32]">ATH Móvil</p>
                  <p className="text-sm text-[#8B7355]">Pago instantáneo desde tu app</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  metodoPago === 'athmovil' ? 'border-red-400 bg-red-400' : 'border-gray-300'}`}>
                  {metodoPago === 'athmovil' && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>

              {/* PayPal */}
              <button onClick={() => setMetodoPago('paypal')}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                  metodoPago === 'paypal' ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-white hover:border-blue-200'}`}>
                <PayPalIcon />
                <div className="flex-1">
                  <p className="font-semibold text-[#4A3F32]">PayPal</p>
                  <p className="text-sm text-[#8B7355]">Tarjeta de crédito/débito o cuenta PayPal</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  metodoPago === 'paypal' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                  {metodoPago === 'paypal' && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>

              {/* Tarjeta */}
              <button onClick={() => setMetodoPago('tarjeta')}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                  metodoPago === 'tarjeta' ? 'border-[#4A3F32] bg-gray-50' : 'border-gray-100 bg-white hover:border-gray-300'}`}>
                <CardIcon />
                <div className="flex-1">
                  <p className="font-semibold text-[#4A3F32]">Tarjeta de Crédito / Débito</p>
                  <p className="text-sm text-[#8B7355]">Visa, Mastercard, American Express</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  metodoPago === 'tarjeta' ? 'border-[#4A3F32] bg-[#4A3F32]' : 'border-gray-300'}`}>
                  {metodoPago === 'tarjeta' && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>
            </div>

            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

            <button onClick={handleIrAPago} disabled={!metodoPago || loading}
              className="mt-5 w-full bg-[#D4A574] text-white py-3.5 rounded-2xl font-semibold hover:bg-[#C4956A] disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparando...</> : 'Continuar al pago →'}
            </button>
          </div>
        )}

        {/* ── PASO 2: Pago según método ── */}
        {step === 2 && (
          <div>
            {/* ATH Móvil */}
            {metodoPago === 'athmovil' && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <ATHIcon />
                  <div>
                    <h2 className="font-display text-xl font-bold text-[#4A3F32]">Pago con ATH Móvil</h2>
                    <p className="text-[#8B7355] text-sm">Total: <span className="font-bold text-[#D4A574]">${cartTotal.toFixed(2)}</span></p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-rose-100 p-5 mb-4 space-y-3">
                  <p className="font-semibold text-[#4A3F32] text-sm">Instrucciones:</p>
                  <ol className="space-y-2 text-sm text-[#8B7355]">
                    <li className="flex gap-2"><span className="w-5 h-5 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>Presiona el botón "Abrir ATH Móvil" abajo</li>
                    <li className="flex gap-2"><span className="w-5 h-5 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>Completa el pago de <strong className="text-[#4A3F32]">${cartTotal.toFixed(2)}</strong> en la app</li>
                    <li className="flex gap-2"><span className="w-5 h-5 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>Regresa aquí e ingresa tu número de confirmación</li>
                  </ol>
                  <div className="bg-red-50 rounded-xl p-3 text-xs text-red-700">
                    📱 Número ATH Móvil: <strong>787-718-7189</strong> · Beauty Salon
                  </div>
                </div>

                <a href={athMovilUrl}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 mb-4 transition-colors">
                  Abrir ATH Móvil →
                </a>

                <div>
                  <label className="block text-sm font-medium text-[#4A3F32] mb-2">Número de confirmación ATH Móvil</label>
                  <input value={referencia} onChange={(e) => setReferencia(e.target.value)}
                    placeholder="Ej: ATH-12345678"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white mb-3" />
                  {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
                  <button onClick={handleConfirmarManual} disabled={loading}
                    className="w-full bg-[#D4A574] hover:bg-[#C4956A] text-white py-3.5 rounded-2xl font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirmando...</> : <><CheckCircle className="w-4 h-4" /> Confirmar pago</>}
                  </button>
                </div>
              </div>
            )}

            {/* PayPal */}
            {metodoPago === 'paypal' && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <PayPalIcon />
                  <div>
                    <h2 className="font-display text-xl font-bold text-[#4A3F32]">Pago con PayPal</h2>
                    <p className="text-[#8B7355] text-sm">Total: <span className="font-bold text-[#D4A574]">${cartTotal.toFixed(2)}</span></p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-rose-100 p-5 mb-4 space-y-3">
                  <p className="font-semibold text-[#4A3F32] text-sm">Instrucciones:</p>
                  <ol className="space-y-2 text-sm text-[#8B7355]">
                    <li className="flex gap-2"><span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>Presiona "Pagar con PayPal" para abrir la página de pago</li>
                    <li className="flex gap-2"><span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>Completa el pago de <strong className="text-[#4A3F32]">${cartTotal.toFixed(2)}</strong> con tu cuenta o tarjeta</li>
                    <li className="flex gap-2"><span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>Regresa aquí e ingresa el ID de transacción de PayPal</li>
                  </ol>
                  <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
                    💳 PayPal: <strong>paypal.me/BeautySalonPR</strong>
                  </div>
                </div>

                <a href={paypalUrl} target="_blank" rel="noreferrer"
                  className="w-full bg-[#003087] hover:bg-[#002070] text-white py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 mb-4 transition-colors">
                  Pagar con PayPal →
                </a>

                <div>
                  <label className="block text-sm font-medium text-[#4A3F32] mb-2">ID de transacción PayPal</label>
                  <input value={referencia} onChange={(e) => setReferencia(e.target.value)}
                    placeholder="Ej: 9XR123456789"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white mb-3" />
                  {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
                  <button onClick={handleConfirmarManual} disabled={loading}
                    className="w-full bg-[#D4A574] hover:bg-[#C4956A] text-white py-3.5 rounded-2xl font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirmando...</> : <><CheckCircle className="w-4 h-4" /> Confirmar pago</>}
                  </button>
                </div>
              </div>
            )}

            {/* Tarjeta con Stripe */}
            {metodoPago === 'tarjeta' && clientSecret && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <CardIcon />
                  <div>
                    <h2 className="font-display text-xl font-bold text-[#4A3F32]">Tarjeta de Crédito / Débito</h2>
                    <p className="text-[#8B7355] text-sm">Pago seguro cifrado con SSL</p>
                  </div>
                </div>

                {/* Logos de tarjetas */}
                <div className="flex gap-2 mb-4">
                  {[
                    { name: 'VISA', bg: 'bg-blue-700', text: 'text-white' },
                    { name: 'MC', bg: 'bg-red-600', text: 'text-white' },
                    { name: 'AMEX', bg: 'bg-green-700', text: 'text-white' },
                  ].map((c) => (
                    <div key={c.name} className={`${c.bg} ${c.text} px-3 py-1 rounded-lg text-xs font-black tracking-wide`}>{c.name}</div>
                  ))}
                  <div className="ml-auto flex items-center gap-1 text-xs text-gray-400">
                    <Lock className="w-3 h-3" /> Pago seguro SSL
                  </div>
                </div>

                <StripePaymentForm
                  clientSecret={clientSecret}
                  monto={cartTotal}
                  descripcion={`${cartItems.length} producto${cartItems.length > 1 ? 's' : ''}`}
                  onSuccess={handlePagoExitoso}
                  onError={(err) => setError(err)}
                />
                {error && <p className="text-red-500 text-sm mt-3 text-center">{error}</p>}
              </div>
            )}
          </div>
        )}

        {/* ── PASO 3: Éxito ── */}
        {step === 3 && pagoExitoso && (
          <PagoExitoso
            tipo="orden"
            datos={{
              orden_id: pagoExitoso.orden_id,
              nombre: pagoExitoso.nombre,
              total: pagoExitoso.total,
            }}
          />
        )}

      </div>
    </div>
  );
}