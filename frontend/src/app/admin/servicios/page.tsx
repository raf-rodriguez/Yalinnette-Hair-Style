'use client';
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';

interface Servicio { id: number; nombre: string; descripcion: string; precio: number; duracion_minutos: number; activo: boolean; }

const EMPTY = { nombre: '', descripcion: '', precio: '', duracion_minutos: '60', activo: true };

export default function AdminServiciosPage() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Servicio | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  const load = () => api.getServicios().then((d) => setServicios(Array.isArray(d) ? d : d.results || []));
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (s: Servicio) => { setEditing(s); setForm({ nombre: s.nombre, descripcion: s.descripcion, precio: String(s.precio), duracion_minutos: String(s.duracion_minutos), activo: s.activo }); setShowForm(true); };

  const handleSave = async () => {
    setLoading(true);
    try {
      const data = { ...form, precio: parseFloat(form.precio), duracion_minutos: parseInt(form.duracion_minutos) };
      if (editing) await api.updateServicio(editing.id, data);
      else await api.createServicio(data);
      setShowForm(false);
      load();
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este servicio?')) return;
    await api.deleteServicio(id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#4A3F32] font-display">Servicios</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-[#D4A574] text-white px-4 py-2 rounded-xl hover:bg-[#C4956A] text-sm font-medium">
          <Plus className="w-4 h-4" /> Nuevo Servicio
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {servicios.map((s) => (
          <div key={s.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-[#4A3F32]">{s.nombre}</h3>
              <span className="bg-[#F9E4E4] text-[#D4A574] font-bold px-3 py-1 rounded-full text-sm">${s.precio}</span>
            </div>
            <p className="text-gray-500 text-sm mb-3">{s.descripcion}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8B7355]">⏱ {s.duracion_minutos} min · {s.activo ? '✅ Activo' : '❌ Inactivo'}</span>
              <div className="flex gap-2">
                <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#D4A574]">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#4A3F32]">{editing ? 'Editar' : 'Nuevo'} Servicio</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input value={form.nombre} onChange={(e) => setForm({...form, nombre: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A574]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea value={form.descripcion} onChange={(e) => setForm({...form, descripcion: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A574] resize-none" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio ($)</label>
                  <input type="number" value={form.precio} onChange={(e) => setForm({...form, precio: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A574]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duración (min)</label>
                  <input type="number" value={form.duracion_minutos} onChange={(e) => setForm({...form, duracion_minutos: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A574]" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.activo} onChange={(e) => setForm({...form, activo: e.target.checked})} className="rounded" />
                <span className="text-sm text-gray-700">Activo</span>
              </label>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={loading || !form.nombre || !form.precio}
                className="flex-1 bg-[#D4A574] text-white py-2 rounded-xl text-sm font-medium hover:bg-[#C4956A] disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
