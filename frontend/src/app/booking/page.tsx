'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Clock, User, CheckCircle, ChevronLeft, Scissors, CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import StripePaymentForm, { PagoExitoso } from '@/components/StripePaymentForm';

interface Servicio { id: number; nombre: string; precio: number; duracion_minutos: number; descripcion: string; }
interface Slot { hora: string; hora_fin: string; disponible: boolean; }

const STEPS = ['Servicio', 'Fecha y Hora', 'Tus Datos', 'Pago', 'Confirmación'];

function BookingContent() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '', notas: '' });
  const [clientSecret, setClientSecret] = useState('');
  const [citaData, setCitaData] = useState<any>(null);
  const [pagoExitoso, setPagoExitoso] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getServicios().then((data) => {
      const list = Array.isArray(data) ? data : data.results || [];
      setServicios(list);
      const sid = searchParams.get('servicio');
      if (sid) {
        const s = list.find((x: Servicio) => x.id === parseInt(sid));
        if (s) { setSelectedServicio(s); setStep(1); }
      }
    });
  }, [searchParams]);

  useEffect(() => {
    if (selectedDate && selectedServicio) {
      setLoadingSlots(true);
      api.getDisponibilidad(selectedDate, selectedServicio.id)
        .then((data) => setSlots(data.slots || []))
        .finally(() => setLoadingSlots(false));
    }
  }, [selectedDate, selectedServicio]);

  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dow = d.getDay();
      if (dow !== 0 && dow !== 1) {
        dates.push(d.toISOString().split('T')[0]);
      }
    }
    return dates;
  };

  // Paso 3→4: crear PaymentIntent y avanzar al pago
  const handleIrAPago = async () => {
    if (!form.nombre || !form.telefono) {
      setError('Nombre y teléfono son requeridos.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stripe/payment-intent/cita/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre,
          telefono: form.telefono,
          email: form.email,
          notas: form.notas,
          servicio_id: selectedServicio!.id,
          fecha_hora: `${selectedDate}T${selectedSlot}:00`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al preparar el pago');
      setClientSecret(data.client_secret);
      setCitaData(data);
      setStep(3); // → paso de pago
    } catch (e: any) {
      setError(e.message || 'Error al preparar el pago');
    } finally {
      setLoading(false);
    }
  };

  // Cuando Stripe confirma el pago exitosamente
  const handlePagoExitoso = async (paymentIntentId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stripe/confirmar/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_intent_id: paymentIntentId, tipo: 'cita' }),
      });
      const data = await res.json();
      if (data.success) {
        setPagoExitoso(data);
        setStep(4); // → pantalla de éxito
      }
    } catch (e) {
      console.error('Error al confirmar pago:', e);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const formatTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h < 12 ? 'AM' : 'PM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="min-h-screen bg-[#FDF8F6] pb-10">
      {/* Header */}
      <div className="bg-white border-b border-rose-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/" className="p-2 rounded-xl hover:bg-[#F9E4E4]">
          <ChevronLeft className="w-5 h-5 text-[#8B7355]" />
        </Link>
        <div className="flex items-center gap-2">
          <Scissors className="w-5 h-5 text-[#D4A574]" />
          <span className="font-display text-lg font-semibold text-[#4A3F32]">Agendar Cita</span>
        </div>
      </div>

      {/* Stepper */}
      {step < 4 && (
        <div className="bg-white border-b border-rose-100 px-4 py-3">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center">
                <div className={`flex flex-col items-center ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                    ${i < step ? 'bg-[#D4A574] text-white' : i === step ? 'bg-[#4A3F32] text-white' : 'bg-gray-200 text-gray-400'}`}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs mt-1 hidden sm:block ${i === step ? 'text-[#4A3F32] font-medium' : 'text-gray-400'}`}>{s}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 ${i < step ? 'bg-[#D4A574]' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 pt-6">

        {/* PASO 0 — Seleccionar servicio */}
        {step === 0 && (
          <div>
            <h2 className="font-display text-xl font-bold text-[#4A3F32] mb-4">¿Qué servicio deseas?</h2>
            <div className="space-y-3">
              {servicios.map((s) => (
                <div key={s.id}
                  onClick={() => { setSelectedServicio(s); setStep(1); }}
                  className="bg-white rounded-2xl p-4 border border-rose-100 cursor-pointer hover:border-[#D4A574] hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#4A3F32] group-hover:text-[#D4A574] transition-colors">{s.nombre}</h3>
                      <p className="text-[#8B7355] text-sm mt-0.5">{s.descripcion}</p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-[#B8856A]">
                        <Clock className="w-3 h-3" /> {s.duracion_minutos} min
                      </div>
                    </div>
                    <span className="bg-[#F9E4E4] text-[#D4A574] font-bold px-3 py-1 rounded-full text-sm ml-3">${s.precio}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PASO 1 — Seleccionar fecha y hora */}
        {step === 1 && selectedServicio && (
          <div>
            <div className="bg-[#F9E4E4] rounded-2xl p-3 mb-5 flex justify-between items-center">
              <div>
                <p className="text-xs text-[#8B7355]">Servicio seleccionado</p>
                <p className="font-semibold text-[#4A3F32]">{selectedServicio.nombre}</p>
              </div>
              <span className="text-[#D4A574] font-bold">${selectedServicio.precio}</span>
            </div>

            <h2 className="font-display text-xl font-bold text-[#4A3F32] mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#D4A574]" /> Elige una fecha
            </h2>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {getAvailableDates().slice(0, 18).map((d) => {
                const date = new Date(d + 'T12:00:00');
                const dow = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][date.getDay()];
                const day = date.getDate();
                const mon = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][date.getMonth()];
                return (
                  <div key={d}
                    onClick={() => setSelectedDate(d)}
                    className={`rounded-xl p-2.5 text-center cursor-pointer transition-all border ${
                      selectedDate === d
                        ? 'bg-[#4A3F32] text-white border-[#4A3F32]'
                        : 'bg-white border-rose-100 hover:border-[#D4A574]'
                    }`}>
                    <p className={`text-xs ${selectedDate === d ? 'text-[#D4A574]' : 'text-[#8B7355]'}`}>{dow}</p>
                    <p className="font-bold text-lg leading-tight">{day}</p>
                    <p className={`text-xs ${selectedDate === d ? 'text-gray-300' : 'text-gray-400'}`}>{mon}</p>
                  </div>
                );
              })}
            </div>

            {selectedDate && (
              <>
                <h2 className="font-display text-xl font-bold text-[#4A3F32] mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#D4A574]" /> Elige un horario
                </h2>
                {loadingSlots ? (
                  <div className="text-center py-4 text-[#8B7355]">Verificando disponibilidad...</div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((slot) => (
                      <button key={slot.hora}
                        disabled={!slot.disponible}
                        onClick={() => setSelectedSlot(slot.hora)}
                        className={`py-2.5 rounded-xl text-sm font-medium transition-all border ${
                          !slot.disponible ? 'bg-gray-100 text-gray-300 cursor-not-allowed border-gray-100' :
                          selectedSlot === slot.hora ? 'bg-[#D4A574] text-white border-[#D4A574]' :
                          'bg-white text-[#4A3F32] border-rose-100 hover:border-[#D4A574]'
                        }`}>
                        {formatTime(slot.hora)}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            <button
              onClick={() => setStep(2)}
              disabled={!selectedDate || !selectedSlot}
              className="mt-6 w-full bg-[#D4A574] disabled:opacity-40 text-white py-3.5 rounded-2xl font-semibold hover:bg-[#C4956A] transition-colors">
              Continuar →
            </button>
          </div>
        )}

        {/* PASO 2 — Datos del cliente */}
        {step === 2 && (
          <div>
            <h2 className="font-display text-xl font-bold text-[#4A3F32] mb-1 flex items-center gap-2">
              <User className="w-5 h-5 text-[#D4A574]" /> Tus datos
            </h2>
            <p className="text-[#8B7355] text-sm mb-5">Para confirmar tu cita</p>

            <div className="bg-[#F9E4E4] rounded-2xl p-3 mb-5 text-sm space-y-1">
              <p><span className="text-[#8B7355]">Servicio:</span> <strong className="text-[#4A3F32]">{selectedServicio?.nombre}</strong></p>
              <p><span className="text-[#8B7355]">Fecha:</span> <strong className="text-[#4A3F32]">{formatDate(selectedDate)}</strong></p>
              <p><span className="text-[#8B7355]">Hora:</span> <strong className="text-[#4A3F32]">{formatTime(selectedSlot)}</strong></p>
            </div>

            <div className="space-y-4">
              {[
                { key: 'nombre', label: 'Nombre completo *', placeholder: 'María López', type: 'text' },
                { key: 'telefono', label: 'Teléfono *', placeholder: '787-123-4567', type: 'tel' },
                { key: 'email', label: 'Email (para recibo)', placeholder: 'tu@email.com', type: 'email' },
                { key: 'notas', label: 'Notas opcionales', placeholder: 'Alergias, preferencias...', type: 'text' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-[#4A3F32] mb-1">{label}</label>
                  <input
                    type={type}
                    value={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A574] bg-white"
                  />
                </div>
              ))}
            </div>

            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

            <div className="mt-5 bg-[#F9E4E4] rounded-xl p-3 text-sm text-[#8B7355] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#D4A574] flex-shrink-0" />
              <span>Se requiere depósito de <strong className="text-[#4A3F32]">$5.00</strong> con tarjeta para confirmar tu cita.</span>
            </div>

            <button
              onClick={handleIrAPago}
              disabled={loading}
              className="mt-4 w-full bg-[#D4A574] text-white py-3.5 rounded-2xl font-semibold hover:bg-[#C4956A] disabled:opacity-50 transition-colors">
              {loading ? 'Preparando pago...' : 'Continuar al pago →'}
            </button>
          </div>
        )}

        {/* PASO 3 — Pago con Stripe */}
        {step === 3 && clientSecret && citaData && (
          <div>
            <h2 className="font-display text-xl font-bold text-[#4A3F32] mb-1">Pago del depósito</h2>
            <p className="text-[#8B7355] text-sm mb-5">Este depósito de $5.00 confirma y reserva tu cita.</p>

            <StripePaymentForm
              clientSecret={clientSecret}
              monto={5.00}
              descripcion={`Depósito — ${selectedServicio?.nombre}`}
              onSuccess={handlePagoExitoso}
              onError={(err) => setError(err)}
            />

            {error && <p className="text-red-500 text-sm mt-3 text-center">{error}</p>}
          </div>
        )}

        {/* PASO 4 — Éxito */}
        {step === 4 && pagoExitoso && (
          <PagoExitoso
            tipo="cita"
            datos={{
              codigo_qr: pagoExitoso.codigo_qr,
              servicio: pagoExitoso.servicio,
              fecha_hora: pagoExitoso.fecha_hora,
              nombre: pagoExitoso.nombre,
            }}
          />
        )}

      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FDF8F6] flex items-center justify-center text-[#8B7355]">Cargando...</div>}>
      <BookingContent />
    </Suspense>
  );
}