'use client';
import { useEffect, useState } from 'react';
import { Send, MessageCircle, Bell, CheckCircle, Phone } from 'lucide-react';
import { api } from '@/lib/api';

interface Cita {
  id: number; nombre: string; telefono: string; servicio_nombre: string;
  fecha_hora: string; estado: string; recordatorio_enviado: boolean;
}

export default function AdminWhatsAppPage() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [telefono, setTelefono] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<number | null>(null);
  const [msgSent, setMsgSent] = useState(false);

  useEffect(() => {
    // Citas próximas sin recordatorio enviado
    api.getCitas('estado=confirmada').then((data) => {
      const list = Array.isArray(data) ? data : data.results || [];
      setCitas(list.filter((c: Cita) => !c.recordatorio_enviado).slice(0, 20));
    });
  }, []);

  const sendReminder = async (citaId: number) => {
    setSent(citaId);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/whatsapp/reminder/${citaId}/`, { method: 'POST' });
      setCitas((prev) => prev.filter((c) => c.id !== citaId));
    } catch (e) {
      console.error(e);
    } finally {
      setSent(null);
    }
  };

  const sendMessage = async () => {
    if (!telefono || !mensaje) return;
    setSending(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/whatsapp/send/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono, mensaje }),
      });
      setMsgSent(true);
      setTelefono('');
      setMensaje('');
      setTimeout(() => setMsgSent(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const PLANTILLAS = [
    { label: '📅 Recordatorio', texto: 'Hola! Te recordamos tu cita mañana en Beauty Salon. ¿Alguna pregunta? Escríbenos aquí 😊' },
    { label: '✅ Confirmación', texto: 'Tu pago fue recibido y tu cita está CONFIRMADA. ¡Te esperamos! ✨ Beauty Salon - 787-718-7189' },
    { label: '💅 Promoción', texto: '¡Hola! Tenemos una promoción especial esta semana. Escribe 1 para ver nuestros servicios y agendar 💅' },
    { label: '❌ Cancelación', texto: 'Lamentablemente debemos cancelar tu cita de hoy. Por favor escríbenos para reagendar. Disculpa los inconvenientes 🙏' },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#4A3F32] font-display">WhatsApp</h1>
          <p className="text-sm text-gray-400">Mensajería y recordatorios automáticos</p>
        </div>
      </div>

      {/* Setup banner */}
      <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6">
        <h2 className="font-semibold text-green-800 mb-1 flex items-center gap-2">
          <MessageCircle className="w-4 h-4" /> Bot de WhatsApp Activo
        </h2>
        <p className="text-green-700 text-sm">
          Tus clientas pueden escribirte a tu número de WhatsApp Business y el bot las guiará para agendar citas automáticamente.
        </p>
        <div className="mt-3 bg-white rounded-xl p-3 text-sm text-gray-600 space-y-1">
          <p><strong>Webhook URL:</strong> <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">https://tu-dominio.com/api/whatsapp/webhook/</code></p>
          <p className="text-xs text-gray-400">Configura esta URL en tu consola de Twilio → WhatsApp Sandbox → "When a message comes in"</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recordatorios pendientes */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#D4A574]" />
              <h2 className="font-semibold text-[#4A3F32]">Recordatorios Pendientes</h2>
            </div>
            <span className="text-xs bg-[#F9E4E4] text-[#D4A574] px-2 py-1 rounded-full font-medium">{citas.length}</span>
          </div>
          <div className="p-4">
            {citas.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Todos los recordatorios enviados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {citas.map((c) => (
                  <div key={c.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl">
                    <div>
                      <p className="font-medium text-[#4A3F32] text-sm">{c.nombre}</p>
                      <p className="text-xs text-gray-400">{c.servicio_nombre}</p>
                      <p className="text-xs text-[#D4A574]">
                        {new Date(c.fecha_hora).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })} ·{' '}
                        {new Date(c.fecha_hora).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button
                      onClick={() => sendReminder(c.id)}
                      disabled={sent === c.id}
                      className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors">
                      {sent === c.id ? (
                        <><CheckCircle className="w-3.5 h-3.5" /> Enviando...</>
                      ) : (
                        <><Send className="w-3.5 h-3.5" /> Recordar</>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mensaje manual */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Send className="w-4 h-4 text-[#D4A574]" />
            <h2 className="font-semibold text-[#4A3F32]">Enviar Mensaje Manual</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-gray-100 px-3 py-2.5 rounded-l-xl border border-gray-200 border-r-0 text-sm text-gray-500">
                  <Phone className="w-3.5 h-3.5 mr-1" />+1
                </div>
                <input
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="flex-1 border border-gray-200 border-l-0 rounded-r-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
                  placeholder="787xxxxxxx" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plantillas rápidas</label>
              <div className="grid grid-cols-2 gap-2">
                {PLANTILLAS.map((p, i) => (
                  <button key={i} onClick={() => setMensaje(p.texto)}
                    className="text-xs text-left bg-[#F9E4E4] hover:bg-[#F0CCCC] text-[#4A3F32] px-2 py-1.5 rounded-lg transition-colors">
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
              <textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A574] resize-none"
                placeholder="Escribe tu mensaje aquí..." />
              <p className="text-xs text-gray-400 mt-1">{mensaje.length} caracteres</p>
            </div>

            {msgSent && (
              <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> ¡Mensaje enviado!
              </div>
            )}

            <button
              onClick={sendMessage}
              disabled={!telefono || !mensaje || sending}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
              <Send className="w-4 h-4" />
              {sending ? 'Enviando...' : 'Enviar por WhatsApp'}
            </button>
          </div>
        </div>
      </div>

      {/* Flujo del bot */}
      <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-semibold text-[#4A3F32] mb-4 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-green-500" /> Flujo del Bot Automático
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[
            { paso: '1', titulo: 'Clienta escribe', desc: 'Envía "Hola" a tu WhatsApp' },
            { paso: '2', titulo: 'Menú principal', desc: 'Bot muestra opciones: Agendar, Ver citas, Cancelar' },
            { paso: '3', titulo: 'Elige servicio', desc: 'Selecciona del menú numerado' },
            { paso: '4', titulo: 'Fecha y hora', desc: 'Escoge fecha disponible y horario libre' },
            { paso: '5', titulo: '¡Cita creada!', desc: 'Confirma y recibe código QR + instrucciones de pago' },
          ].map((p) => (
            <div key={p.paso} className="text-center">
              <div className="w-8 h-8 bg-[#D4A574] text-white rounded-full flex items-center justify-center font-bold text-sm mx-auto mb-2">{p.paso}</div>
              <p className="font-medium text-[#4A3F32] text-xs">{p.titulo}</p>
              <p className="text-gray-400 text-xs mt-0.5">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
