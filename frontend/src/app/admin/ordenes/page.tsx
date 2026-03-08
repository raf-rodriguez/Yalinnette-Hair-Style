'use client';
import { useEffect, useState, useCallback } from 'react';
import { Check, X, Eye, Trash2, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';

interface Orden { id: number; nombre_cliente: string; telefono_cliente: string; total: number; estado: string; metodo_pago: string; referencia_pago: string; creada: string; items: any[]; }

const ESTADO_COLORS: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  pagada: 'bg-green-100 text-green-700',
  cancelada: 'bg-red-100 text-red-700',
};

export default function AdminOrdenesPage() {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [filtro, setFiltro] = useState('');
  const [selected, setSelected] = useState<Orden | null>(null);
  const [referencia, setReferencia] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    const params = filtro ? `estado=${filtro}` : '';
    api.getOrdenes(params).then((d) => setOrdenes(Array.isArray(d) ? d : d.results || []));
  }, [filtro]);

  useEffect(() => { load(); }, [load]);

  const handleConfirmar = async (id: number) => {
    setLoading(true);
    try {
      await api.confirmarPagoOrden(id, referencia);
      setSelected(null);
      load(); // ← refresh inmediato
    } finally { setLoading(false); }
  };

  const handleCancelar = async (id: number) => {
    setLoading(true);
    try {
      await api.cancelarOrden(id);
      setSelected(null);
      load(); // ← refresh inmediato
    } finally { setLoading(false); }
  };

  const handleEliminar = async (id: number) => {
    setDeleting(true);
    try {
      await api.deleteOrden(id);
      setOrdenes((prev) => prev.filter((o) => o.id !== id)); // ← actualización local inmediata
      setConfirmDelete(null);
      if (selected?.id === id) setSelected(null);
    } catch (e: any) {
      alert('Error al eliminar la orden');
    } finally { setDeleting(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#4A3F32] font-display">Órdenes</h1>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A574] bg-white">
          <option value="">Todos</option>
          <option value="pendiente">Pendientes</option>
          <option value="pagada">Pagadas</option>
          <option value="cancelada">Canceladas</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Orden</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Total</th>
                <th className="px-4 py-3 text-left">Pago</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ordenes.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-[#4A3F32]">#{o.id}</td>
                  <td className="px-4 py-3">
                    <p className="text-[#4A3F32]">{o.nombre_cliente}</p>
                    <p className="text-gray-400 text-xs">{o.telefono_cliente}</p>
                  </td>
                  <td className="px-4 py-3 font-bold text-[#D4A574]">${parseFloat(String(o.total)).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs capitalize text-gray-500">{o.metodo_pago}</span>
                    {o.referencia_pago && <p className="text-xs text-gray-400 font-mono">{o.referencia_pago}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${ESTADO_COLORS[o.estado] || 'bg-gray-100 text-gray-600'}`}>{o.estado}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(o.creada).toLocaleDateString('es')}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {/* Ver detalle */}
                      <button onClick={() => { setSelected(o); setReferencia(o.referencia_pago || ''); }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#D4A574]" title="Ver detalle">
                        <Eye className="w-4 h-4" />
                      </button>
                      {/* Confirmar pago */}
                      {o.estado === 'pendiente' && (
                        <>
                          <button onClick={() => handleConfirmar(o.id)}
                            className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-500" title="Confirmar pago">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleCancelar(o.id)}
                            className="p-1.5 rounded-lg hover:bg-orange-50 text-gray-400 hover:text-orange-500" title="Cancelar orden">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {/* Eliminar del sistema */}
                      <button onClick={() => setConfirmDelete(o.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500" title="Eliminar del sistema">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {ordenes.length === 0 && <div className="text-center py-8 text-gray-400">No hay órdenes</div>}
        </div>
      </div>

      {/* Modal detalle */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#4A3F32]">Orden #{selected.id}</h2>
              <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-2 text-sm mb-4">
              <p><strong>Cliente:</strong> {selected.nombre_cliente}</p>
              <p><strong>Tel:</strong> {selected.telefono_cliente}</p>
              <p><strong>Método:</strong> {selected.metodo_pago}</p>
              <p><strong>Estado:</strong> <span className={`capitalize px-2 py-0.5 rounded-full text-xs ${ESTADO_COLORS[selected.estado]}`}>{selected.estado}</span></p>
            </div>

            <h3 className="font-semibold text-[#4A3F32] mb-2 text-sm">Productos</h3>
            <div className="space-y-1 mb-4">
              {selected.items?.map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-sm bg-gray-50 p-2 rounded-lg">
                  <span>{item.producto_nombre} x{item.cantidad}</span>
                  <span className="font-medium">${parseFloat(item.subtotal).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-[#D4A574]">${parseFloat(String(selected.total)).toFixed(2)}</span>
              </div>
            </div>

            {selected.estado === 'pendiente' && (
              <>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Referencia de Pago</label>
                  <input value={referencia} onChange={(e) => setReferencia(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A574]"
                    placeholder="# de confirmación" />
                </div>
                <div className="flex gap-3 mb-3">
                  <button onClick={() => handleCancelar(selected.id)} disabled={loading}
                    className="flex-1 bg-orange-100 text-orange-600 py-2 rounded-xl text-sm font-medium hover:bg-orange-200 disabled:opacity-50">
                    ✗ Cancelar Orden
                  </button>
                  <button onClick={() => handleConfirmar(selected.id)} disabled={loading}
                    className="flex-1 bg-green-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-green-600 disabled:opacity-50">
                    {loading ? 'Confirmando...' : '✓ Confirmar Pago'}
                  </button>
                </div>
              </>
            )}

            {/* Botón eliminar en modal */}
            <button onClick={() => { setSelected(null); setConfirmDelete(selected.id); }}
              className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-500 py-2 rounded-xl text-sm font-medium transition-colors">
              <Trash2 className="w-4 h-4" /> Eliminar del sistema
            </button>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminación */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <h2 className="font-bold text-[#4A3F32]">¿Eliminar orden #{confirmDelete}?</h2>
            </div>
            <p className="text-gray-500 text-sm mb-5">Esta acción es permanente y no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-50 text-sm">
                Cancelar
              </button>
              <button onClick={() => handleEliminar(confirmDelete)} disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2">
                {deleting ? 'Eliminando...' : <><Trash2 className="w-4 h-4" /> Eliminar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}