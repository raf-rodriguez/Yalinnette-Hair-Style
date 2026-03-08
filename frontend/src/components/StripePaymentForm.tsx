'use client';
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Lock, CheckCircle, AlertCircle, Loader2, CreditCard } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);

const ELEMENT_STYLE = {
  style: {
    base: {
      fontSize: '15px',
      color: '#4A3F32',
      fontFamily: 'Inter, sans-serif',
      '::placeholder': { color: '#c0b0a0' },
    },
    invalid: { color: '#ef4444' },
  },
};

// ─── Formulario interno (recibe clientSecret como prop) ───────────────────────
function PagoFormInterno({
  clientSecret, monto, onSuccess, onError,
}: {
  clientSecret: string; monto: number;
  onSuccess: (id: string) => void; onError: (e: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [nombreTarjeta, setNombreTarjeta] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (!nombreTarjeta.trim()) {
      setErrorMsg('Ingresa el nombre que aparece en la tarjeta.');
      return;
    }
    setProcesando(true);
    setErrorMsg('');

    const cardElement = elements.getElement(CardNumberElement);
    if (!cardElement) { setProcesando(false); return; }

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: { name: nombreTarjeta },
        },
      });

      if (error) {
        const msg =
          error.type === 'card_error' || error.type === 'validation_error'
            ? error.message || 'Error en la tarjeta'
            : 'Ocurrió un error inesperado. Intenta de nuevo.';
        setErrorMsg(msg);
        onError(msg);
      } else if (paymentIntent?.status === 'succeeded') {
        onSuccess(paymentIntent.id);
      }
    } catch {
      const msg = 'Error de conexión. Verifica tu internet.';
      setErrorMsg(msg);
      onError(msg);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Banner pago seguro — igual que Base44 */}
      <div className="bg-[#1a1a2e] rounded-xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white text-sm font-medium">
          <Lock className="w-4 h-4 text-green-400" />
          Pago seguro cifrado
        </div>
        <div className="flex gap-1.5">
          <span className="bg-blue-700 text-white text-xs font-black px-2 py-0.5 rounded">VISA</span>
          <span className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded">MC</span>
          <span className="bg-green-700 text-white text-xs font-black px-2 py-0.5 rounded">AMEX</span>
        </div>
      </div>

      {/* Nombre en la tarjeta */}
      <div>
        <label className="block text-sm font-medium text-[#4A3F32] mb-1.5">
          Nombre en la tarjeta <span className="text-red-400">*</span>
        </label>
        <input
          value={nombreTarjeta}
          onChange={(e) => setNombreTarjeta(e.target.value.toUpperCase())}
          placeholder="NOMBRE APELLIDO"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#4A3F32] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#D4A574] bg-white tracking-widest font-medium uppercase"
        />
      </div>

      {/* Número de tarjeta */}
      <div>
        <label className="block text-sm font-medium text-[#4A3F32] mb-1.5">
          Número de tarjeta <span className="text-red-400">*</span>
        </label>
        <div className="border border-gray-200 rounded-xl px-4 py-3.5 bg-white focus-within:ring-2 focus-within:ring-[#D4A574] transition-all flex items-center gap-3">
          <CardNumberElement options={{ ...ELEMENT_STYLE, showIcon: true } as any} className="flex-1" />
        </div>
      </div>

      {/* Fecha + CVV lado a lado — igual que Base44 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-[#4A3F32] mb-1.5">
            Fecha de expiración <span className="text-red-400">*</span>
          </label>
          <div className="border border-gray-200 rounded-xl px-4 py-3.5 bg-white focus-within:ring-2 focus-within:ring-[#D4A574] transition-all">
            <CardExpiryElement options={ELEMENT_STYLE} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#4A3F32] mb-1.5">
            Código de seguridad <span className="text-red-400">*</span>
          </label>
          <div className="border border-gray-200 rounded-xl px-4 py-3.5 bg-white focus-within:ring-2 focus-within:ring-[#D4A574] transition-all">
            <CardCvcElement options={ELEMENT_STYLE} />
          </div>
        </div>
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{errorMsg}</p>
        </div>
      )}

      {/* Botón pagar */}
      <button
        type="submit"
        disabled={!stripe || procesando}
        className="w-full bg-[#1a1a2e] hover:bg-[#2a2a4e] disabled:opacity-60 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all"
      >
        {procesando
          ? <><Loader2 className="w-5 h-5 animate-spin" /> Procesando...</>
          : <><Lock className="w-4 h-4" /> Pagar ${monto.toFixed(2)} USD</>
        }
      </button>

      <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
        <Lock className="w-3 h-3" /> Tus datos están protegidos con cifrado SSL
      </p>
    </form>
  );
}

// ─── Wrapper con <Elements> ───────────────────────────────────────────────────
interface StripePaymentFormProps {
  clientSecret: string;
  monto: number;
  descripcion: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}

export default function StripePaymentForm({
  clientSecret, monto, descripcion, onSuccess, onError,
}: StripePaymentFormProps) {
  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret, locale: 'es' }}
    >
      <PagoFormInterno
        clientSecret={clientSecret}
        monto={monto}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}

// ─── Pantalla de éxito reutilizable ──────────────────────────────────────────
interface PagoExitosoProps {
  tipo: 'cita' | 'orden';
  datos: {
    codigo_qr?: string;
    servicio?: string;
    fecha_hora?: string;
    orden_id?: number;
    nombre: string;
    total?: number;
  };
}

export function PagoExitoso({ tipo, datos }: PagoExitosoProps) {
  return (
    <div className="text-center py-8 px-4">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-green-500" />
      </div>
      <h2 className="font-display text-2xl font-bold text-[#4A3F32] mb-2">¡Pago Confirmado!</h2>

      {tipo === 'cita' ? (
        <>
          <p className="text-[#8B7355] mb-6">Tu cita ha sido reservada exitosamente.</p>
          <div className="bg-[#F9E4E4] rounded-2xl p-5 text-left space-y-3 max-w-sm mx-auto">
            <div className="text-center mb-3">
              <p className="text-xs text-[#8B7355] uppercase tracking-wide">Código de cita</p>
              <p className="text-2xl font-bold text-[#D4A574] font-mono">{datos.codigo_qr}</p>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#8B7355]">Servicio</span>
              <span className="text-[#4A3F32] font-medium">{datos.servicio}</span>
            </div>
            {datos.fecha_hora && (
              <div className="flex justify-between text-sm">
                <span className="text-[#8B7355]">Fecha y hora</span>
                <span className="text-[#4A3F32] font-medium">
                  {new Date(datos.fecha_hora).toLocaleString('es', {
                    weekday: 'short', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-[#8B7355]">Depósito pagado</span>
              <span className="text-green-600 font-bold">$5.00 ✓</span>
            </div>
          </div>
          <p className="text-xs text-[#8B7355] mt-4">
            📍 Beauty Salon · Caguas, Puerto Rico<br />
            📞 787-718-7189 · Mar–Sáb 9AM–6PM
          </p>
        </>
      ) : (
        <>
          <p className="text-[#8B7355] mb-6">Tu pedido ha sido procesado exitosamente.</p>
          <div className="bg-[#F9E4E4] rounded-2xl p-5 text-left space-y-3 max-w-sm mx-auto">
            <div className="flex justify-between text-sm">
              <span className="text-[#8B7355]">Número de orden</span>
              <span className="text-[#4A3F32] font-bold">#{datos.orden_id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#8B7355]">Cliente</span>
              <span className="text-[#4A3F32] font-medium">{datos.nombre}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#8B7355]">Total pagado</span>
              <span className="text-green-600 font-bold">${datos.total?.toFixed(2)} ✓</span>
            </div>
          </div>
          <p className="text-xs text-[#8B7355] mt-4">
            Recibirás un recibo por email · Beauty Salon 787-718-7189
          </p>
        </>
      )}
    </div>
  );
}