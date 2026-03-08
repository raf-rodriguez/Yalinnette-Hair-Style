'use client';
import { useEffect, useState } from 'react';
import { Plus, Search, CheckCircle, XCircle, Check, X } from 'lucide-react';
import { api } from '@/lib/api';

interface Cita {
  id: number; nombre: string; telefono: string; email: string;
  servicio: number; servicio_nombre: string; servicio_precio: number;
  fecha_hora: string; estado: string; pagado: boolean;
  monto_deposito: number; codigo_qr: string; notas: string;
}
interface Servicio { id: number; nombre: string; precio: number; }

const ESTADOS = ['', 'pendiente', 'confirmada', 'completada', 'cancelada'];
const ESTADO_COLORS: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  confirmada: 'bg-blue-100 text-blue-700',
  completada: 'bg-green-100 text-green-700',
  cancelada: 'bg-red-100 text-red-700',
};

export default function AdminCitasPage() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<Cita | null>(null);
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '', servicio: '', fecha_hora: '', notas: '' });
  const [loading, setLoading] = useState(false);

  const loadCitas = () => {
    const params = new URLSearchParams();
    if (filtroEstado) params.append('estado', filtroEstado);
    if (filtroFecha) params.append('fecha', filtroFecha);
    api.getCitas(params.toString()).then((data) => setCitas(Array.isArray(data) ? data : data.results || []));
  };

  useEffect(() => {
    api.getServicios().then((data) => setServicios(Array.isArray(data) ? data : data.results || []));
  }, []);

  useEffect(() => { loadCitas(); }, [filtroEstado, filtroFecha]);

  const handleCreate = async () => {
    setLoading(true);
    try {
      await api.createCita({ ...form, servicio: parseInt(form.servicio), pagado: false });
      setShowNew(false);
      setForm({ nombre: '', telefono: '', email: '', servicio: '', fecha_hora: '', notas: '' });
      loadCitas();
    } finally { setLoading(false); }
  };

  const handleAccion = async (accion: 'confirmar' | 'completar' | 'cancelar', id: number) => {
    if (accion === 'confirmar') await api.confirmarCita(id);
    else if (accion === 'completar') await api.completarCita(id);
    else await api.cancelarCita(id);
    setSelected(null);
    loadCitas();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#4A3F32] font-display">Citas</h1>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-[#D4A574] text-white px-4 py-2 rounded-xl hover:bg-[#C4956A] text-sm font-medium">
          <Plus className="w-4 h-4" /> Nueva Cita
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A574] bg-white">
          {ESTADOS.map((e) => <option key={e} value={e}>{e || 'Todos los estados'}</option>)}
        </select>
        <input type="date" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A574] bg-white" />
        {filtroFecha && <button onClick={() => setFiltroFecha('')} className="text-sm text-gray-400 hover:text-gray-600">Limpiar</button>}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Servicio</th>
                <th className="px-4 py-3 text-left">Fecha & Hora</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Pago</th>
                <th className="px-4 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {citas.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(c)}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#4A3F32]">{c.nombre}</p>
                    <p className="text-gray-400 text-xs">{c.telefono}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.servicio_nombre}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <p>{new Date(c.fecha_hora).toLocaleDateString('es')}</p>
                    <p className="text-xs text-[#D4A574]">{new Date(c.fecha_hora).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${ESTADO_COLORS[c.estado] || 'bg-gray-100 text-gray-600'}`}>{c.estado}</span>
                  </td>
                  <td className="px-4 py-3">
                    {c.pagado ? <span className="text-green-500 flex items-center gap-1 text-xs"><CheckCircle className="w-3 h-3" />Pagado</span>
                      : <span className="text-gray-400 text-xs">Pendiente</span>}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      {c.estado === 'pendiente' && (
                        <button onClick={() => handleAccion('confirmar', c.id)}
                          className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-xs" title="Confirmar">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {c.estado === 'confirmada' && (
                        <button onClick={() => handleAccion('completar', c.id)}
                          className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 text-xs" title="Completar">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {['pendiente', 'confirmada'].includes(c.estado) && (
                        <button onClick={() => handleAccion('cancelar', c.id)}
                          className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 text-xs" title="Cancelar">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {citas.length === 0 && <div className="text-center py-8 text-gray-400">No hay citas</div>}
        </div>
      </div>

      {/* New Cita Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#4A3F32]">Nueva Cita</h2>
              <button onClick={() => setShowNew(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Nombre', key: 'nombre', type: 'text', placeholder: 'Nombre completo' },
                { label: 'Teléfono', key: 'telefono', type: 'text', placeholder: '787-xxx-xxxx' },
                { label: 'Email', key: 'email', type: 'email', placeholder: 'email@ejemplo.com' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type} value={(form as any)[key]} onChange={(e) => setForm({...form, [key]: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
                    placeholder={placeholder} />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Servicio</label>
                <select value={form.servicio} onChange={(e) => setForm({...form, servicio: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A574] bg-white">
                  <option value="">Seleccionar servicio</option>
                  {servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre} - ${s.precio}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y Hora</label>
                <input type="datetime-local" value={form.fecha_hora} onChange={(e) => setForm({...form, fecha_hora: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A574]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea value={form.notas} onChange={(e) => setForm({...form, notas: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A574] resize-none"
                  rows={2} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowNew(false)} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleCreate} disabled={loading || !form.nombre || !form.telefono || !form.servicio || !form.fecha_hora}
                className="flex-1 bg-[#D4A574] text-white py-2 rounded-xl text-sm font-medium hover:bg-[#C4956A] disabled:opacity-50">
                {loading ? 'Guardando...' : 'Crear Cita'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#4A3F32]">Detalle de Cita</h2>
              <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-2 text-sm text-gray-600 mb-5">
              <p><strong>Cliente:</strong> {selected.nombre}</p>
              <p><strong>Tel:</strong> {selected.telefono}</p>
              {selected.email && <p><strong>Email:</strong> {selected.email}</p>}
              <p><strong>Servicio:</strong> {selected.servicio_nombre}</p>
              <p><strong>Fecha:</strong> {new Date(selected.fecha_hora).toLocaleString('es')}</p>
              <p><strong>Estado:</strong> <span className={`capitalize px-2 py-0.5 rounded-full text-xs ${ESTADO_COLORS[selected.estado]}`}>{selected.estado}</span></p>
              <p><strong>Pago:</strong> {selected.pagado ? '✅ Pagado' : '⏳ Pendiente'}</p>
              <p><strong>Código QR:</strong> <span className="font-mono text-[#D4A574]">{selected.codigo_qr}</span></p>
              {selected.notas && <p><strong>Notas:</strong> {selected.notas}</p>}
            </div>
            <div className="flex gap-2 flex-wrap">
              {selected.estado === 'pendiente' && (
                <button onClick={() => handleAccion('confirmar', selected.id)}
                  className="flex-1 bg-blue-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-blue-600">
                  ✓ Confirmar
                </button>
              )}
              {selected.estado === 'confirmada' && (
                <button onClick={() => handleAccion('completar', selected.id)}
                  className="flex-1 bg-green-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-green-600">
                  ✓ Completar
                </button>
              )}
              {['pendiente', 'confirmada'].includes(selected.estado) && (
                <button onClick={() => handleAccion('cancelar', selected.id)}
                  className="flex-1 bg-red-100 text-red-600 py-2 rounded-xl text-sm font-medium hover:bg-red-200">
                  ✗ Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
