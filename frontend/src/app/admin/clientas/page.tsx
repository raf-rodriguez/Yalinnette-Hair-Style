'use client';
import { useEffect, useState, useCallback } from 'react';
import { Search, User, X, Pencil, Trash2, Save, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';

interface Clienta { id: number; nombre: string; telefono: string; email: string; total_visitas: number; total_gastado: number; creada: string; notas: string; }

const ESTADO_COLORS: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  confirmada: 'bg-blue-100 text-blue-700',
  completada: 'bg-green-100 text-green-700',
  cancelada: 'bg-red-100 text-red-700',
};

export default function AdminClientasPage() {
  const [clientas, setClientas] = useState<Clienta[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Clienta | null>(null);
  const [historial, setHistorial] = useState<any | null>(null);
  const [editando, setEditando] = useState(false);
  const [editForm, setEditForm] = useState({ nombre: '', telefono: '', email: '', notas: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ← useCallback para poder llamarla en cualquier momento
  const cargarClientas = useCallback(() => {
    api.getClientas(search).then((d) => setClientas(Array.isArray(d) ? d : d.results || []));
  }, [search]);

  useEffect(() => { cargarClientas(); }, [cargarClientas]);

  const openHistorial = async (c: Clienta) => {
    setSelected(c);
    setEditando(false);
    setConfirmDelete(false);
    setEditError('');
    setEditForm({ nombre: c.nombre, telefono: c.telefono, email: c.email || '', notas: c.notas || '' });
    const h = await api.getClientaHistorial(c.id);
    setHistorial(h);
  };

  const handleGuardar = async () => {
    if (!editForm.nombre || !editForm.telefono) {
      setEditError('Nombre y teléfono son requeridos.');
      return;
    }
    setSavingEdit(true);
    setEditError('');
    try {
      const updated = await api.updateClienta(selected!.id, editForm);
      // ← Actualizar en la lista local SIN hacer refetch
      setClientas((prev) => prev.map((c) => c.id === updated.id ? updated : c));
      setSelected(updated);
      setEditando(false);
    } catch (e: any) {
      setEditError(e.message || 'Error al guardar');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleEliminar = async () => {
    setDeleting(true);
    try {
      await api.deleteClienta(selected!.id);
      // ← Eliminar de la lista local SIN hacer refetch
      setClientas((prev) => prev.filter((c) => c.id !== selected!.id));
      setSelected(null);
      setHistorial(null);
      setConfirmDelete(false);
    } catch (e: any) {
      setEditError(e.message || 'Error al eliminar');
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const cerrarModal = () => {
    setSelected(null);
    setHistorial(null);
    setEditando(false);
    setConfirmDelete(false);
    setEditError('');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#4A3F32] font-display">Clientas</h1>
        <span className="text-sm text-gray-400">{clientas.length} clientas</span>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A574] bg-white"
          placeholder="Buscar por nombre o teléfono..." />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clientas.map((c) => (
          <div key={c.id} onClick={() => openHistorial(c)}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-[#F9E4E4] rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-[#D4A574]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-[#4A3F32] group-hover:text-[#D4A574] transition-colors">{c.nombre}</h3>
                <p className="text-gray-400 text-sm">{c.telefono}</p>
                {c.email && <p className="text-gray-400 text-xs truncate">{c.email}</p>}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                <button onClick={(e) => { e.stopPropagation(); openHistorial(c); setTimeout(() => setEditando(true), 100); }}
                  className="p-1.5 bg-[#F9E4E4] hover:bg-[#D4A574] hover:text-white text-[#D4A574] rounded-lg transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); openHistorial(c); setTimeout(() => setConfirmDelete(true), 100); }}
                  className="p-1.5 bg-red-50 hover:bg-red-500 hover:text-white text-red-400 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-[#4A3F32]">{c.total_visitas}</p>
                <p className="text-gray-400 text-xs">Visitas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#D4A574]">${parseFloat(String(c.total_gastado)).toFixed(0)}</p>
                <p className="text-gray-400 text-xs">Gastado</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Desde</p>
                <p className="text-sm text-gray-600">{new Date(c.creada).toLocaleDateString('es', { month: 'short', year: 'numeric' })}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {clientas.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No hay clientas registradas</p>
          <p className="text-xs mt-1">Las clientas se crean automáticamente al agendar citas</p>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">

            {/* Confirmación de eliminación */}
            {confirmDelete ? (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <h2 className="font-bold text-[#4A3F32]">¿Eliminar clienta?</h2>
                </div>
                <p className="text-gray-500 text-sm mb-1">Vas a eliminar a:</p>
                <p className="font-semibold text-[#4A3F32] mb-1">{selected.nombre}</p>
                <p className="text-gray-400 text-sm mb-4">{selected.telefono}</p>
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600 mb-5">
                  ⚠️ Esta acción es permanente. Se eliminarán todos sus datos, citas y órdenes asociadas.
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmDelete(false)}
                    className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-50 text-sm">
                    Cancelar
                  </button>
                  <button onClick={handleEliminar} disabled={deleting}
                    className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2">
                    {deleting ? 'Eliminando...' : <><Trash2 className="w-4 h-4" /> Sí, eliminar</>}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#F9E4E4] rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-[#D4A574]" />
                    </div>
                    <div>
                      <h2 className="font-bold text-[#4A3F32]">{selected.nombre}</h2>
                      <p className="text-gray-400 text-sm">{selected.telefono}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setEditando(!editando); setEditError(''); }}
                      className={`p-2 rounded-xl transition-colors ${editando ? 'bg-[#D4A574] text-white' : 'bg-[#F9E4E4] text-[#D4A574] hover:bg-[#D4A574] hover:text-white'}`}>
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setConfirmDelete(true)}
                      className="p-2 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={cerrarModal} className="p-2 rounded-xl hover:bg-gray-100">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-[#F9E4E4] rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-[#4A3F32]">{selected.total_visitas}</p>
                    <p className="text-xs text-[#8B7355]">Visitas</p>
                  </div>
                  <div className="bg-[#F9E4E4] rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-[#D4A574]">${parseFloat(String(selected.total_gastado)).toFixed(2)}</p>
                    <p className="text-xs text-[#8B7355]">Total Gastado</p>
                  </div>
                </div>

                {/* Formulario edición */}
                {editando && (
                  <div className="bg-[#FDF8F6] rounded-2xl p-4 mb-5 border border-rose-100">
                    <h3 className="font-semibold text-[#4A3F32] mb-3 text-sm">Editar información</h3>
                    <div className="space-y-3">
                      {[
                        { key: 'nombre', label: 'Nombre *', type: 'text', placeholder: 'Nombre completo' },
                        { key: 'telefono', label: 'Teléfono *', type: 'tel', placeholder: '787-123-4567' },
                        { key: 'email', label: 'Email', type: 'email', placeholder: 'correo@email.com' },
                        { key: 'notas', label: 'Notas', type: 'text', placeholder: 'Notas internas...' },
                      ].map(({ key, label, type, placeholder }) => (
                        <div key={key}>
                          <label className="block text-xs font-medium text-[#8B7355] mb-1">{label}</label>
                          <input type={type} value={(editForm as any)[key]}
                            onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                            placeholder={placeholder}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A574] bg-white" />
                        </div>
                      ))}
                    </div>
                    {editError && <p className="text-red-500 text-xs mt-2">{editError}</p>}
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => { setEditando(false); setEditError(''); }}
                        className="flex-1 border border-gray-200 text-gray-500 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                        Cancelar
                      </button>
                      <button onClick={handleGuardar} disabled={savingEdit}
                        className="flex-1 bg-[#D4A574] hover:bg-[#C4956A] disabled:opacity-50 text-white py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5">
                        {savingEdit ? 'Guardando...' : <><Save className="w-3.5 h-3.5" /> Guardar cambios</>}
                      </button>
                    </div>
                  </div>
                )}

                {/* Historial */}
                {historial ? (
                  <>
                    <h3 className="font-semibold text-[#4A3F32] mb-3">Últimas Citas</h3>
                    {historial.citas.length === 0
                      ? <p className="text-gray-400 text-sm mb-4">Sin citas</p>
                      : (
                        <div className="space-y-2 mb-4">
                          {historial.citas.map((c: any) => (
                            <div key={c.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl text-sm">
                              <div>
                                <p className="font-medium text-[#4A3F32]">{c.servicio_nombre}</p>
                                <p className="text-gray-400 text-xs">{new Date(c.fecha_hora).toLocaleDateString('es')}</p>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${ESTADO_COLORS[c.estado] || 'bg-gray-100 text-gray-600'}`}>{c.estado}</span>
                            </div>
                          ))}
                        </div>
                      )}

                    <h3 className="font-semibold text-[#4A3F32] mb-3">Últimas Órdenes</h3>
                    {historial.ordenes.length === 0
                      ? <p className="text-gray-400 text-sm">Sin órdenes</p>
                      : (
                        <div className="space-y-2">
                          {historial.ordenes.map((o: any) => (
                            <div key={o.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl text-sm">
                              <div>
                                <p className="font-medium text-[#4A3F32]">Orden #{o.id}</p>
                                <p className="text-gray-400 text-xs">{new Date(o.creada).toLocaleDateString('es')}</p>
                              </div>
                              <span className="text-[#D4A574] font-bold">${o.total}</span>
                            </div>
                          ))}
                        </div>
                      )}
                  </>
                ) : !editando && <p className="text-gray-400 text-sm">Cargando historial...</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}