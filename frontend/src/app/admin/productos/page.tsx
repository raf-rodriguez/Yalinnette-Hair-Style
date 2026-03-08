'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, AlertTriangle, Tag, Sparkles, Package, Check } from 'lucide-react';
import { api } from '@/lib/api';

interface Producto {
  id: number; nombre: string; descripcion: string; precio: number;
  precio_costo: number; stock: number; categoria: string; destacado: boolean; activo: boolean;
}

const EMPTY = {
  nombre: '', descripcion: '', precio: '', precio_costo: '',
  stock: '10', categoria: '', destacado: false, activo: true,
};

export default function AdminProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Producto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [nuevaCat, setNuevaCat] = useState('');
  const [showAgregarCat, setShowAgregarCat] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    api.getProductos().then((d) => {
      const lista: Producto[] = Array.isArray(d) ? d : d.results || [];
      setProductos(lista);
      setCategorias((prev) => {
        const saved = localStorage.getItem('beauty_categorias');
        const base: string[] = saved ? JSON.parse(saved) : prev;
        const fromDB = lista.map((p) => p.categoria).filter(Boolean);
        const merged = Array.from(new Set([...base, ...fromDB]));
        localStorage.setItem('beauty_categorias', JSON.stringify(merged));
        return merged;
      });
    });
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('beauty_categorias');
    if (saved) setCategorias(JSON.parse(saved));
    load();
  }, [load]);

  const guardarCategorias = (cats: string[]) => {
    setCategorias(cats);
    localStorage.setItem('beauty_categorias', JSON.stringify(cats));
  };

  const handleAgregarCategoria = () => {
    const cat = nuevaCat.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!cat) return;
    if (categorias.includes(cat)) { alert('Esa categoría ya existe.'); return; }
    const updated = [...categorias, cat];
    guardarCategorias(updated);
    setForm((f: any) => ({ ...f, categoria: cat }));
    setNuevaCat('');
    setShowAgregarCat(false);
  };

  const handleEliminarCategoria = (cat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`¿Eliminar la categoría "${cat}"?`)) return;
    const updated = categorias.filter((c) => c !== cat);
    guardarCategorias(updated);
    if (form.categoria === cat) setForm((f: any) => ({ ...f, categoria: '' }));
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY, categoria: categorias[0] || '' });
    setShowAgregarCat(false);
    setNuevaCat('');
    setSaved(false);
    setShowForm(true);
  };

  const openEdit = (p: Producto) => {
    setEditing(p);
    if (p.categoria && !categorias.includes(p.categoria)) guardarCategorias([...categorias, p.categoria]);
    setForm({
      nombre: p.nombre, descripcion: p.descripcion,
      precio: String(p.precio), precio_costo: String(p.precio_costo),
      stock: String(p.stock), categoria: p.categoria,
      destacado: p.destacado, activo: p.activo,
    });
    setShowAgregarCat(false);
    setNuevaCat('');
    setSaved(false);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.categoria) { alert('Selecciona o añade una categoría.'); return; }
    setLoading(true);
    try {
      const data = { ...form, precio: parseFloat(form.precio), precio_costo: parseFloat(form.precio_costo || '0'), stock: parseInt(form.stock) };
      if (editing) {
        const updated = await api.updateProducto(editing.id, data);
        setProductos((prev) => prev.map((p) => p.id === editing.id ? updated : p));
      } else {
        const nuevo = await api.createProducto(data);
        setProductos((prev) => [nuevo, ...prev]);
      }
      setSaved(true);
      setTimeout(() => setShowForm(false), 600);
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.deleteProducto(confirmDelete.id);
      setProductos((prev) => prev.filter((p) => p.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch { alert('Error al eliminar el producto.'); }
    finally { setDeleting(false); }
  };

  const margen = (p: Producto) => {
    const m = ((p.precio - p.precio_costo) / p.precio) * 100;
    return isNaN(m) ? 0 : Math.round(m);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#4A3F32]">Productos</h1>
          <p className="text-sm text-[#8B7355] mt-0.5">{productos.length} productos registrados</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-[#D4A574] text-white px-5 py-2.5 rounded-xl hover:bg-[#C4956A] text-sm font-semibold shadow-md shadow-[#D4A574]/30 transition-all">
          <Plus className="w-4 h-4" /> Nuevo Producto
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3.5 text-left">Producto</th>
                <th className="px-5 py-3.5 text-left">Categoría</th>
                <th className="px-5 py-3.5 text-left">Precio</th>
                <th className="px-5 py-3.5 text-left">Stock</th>
                <th className="px-5 py-3.5 text-left">Estado</th>
                <th className="px-5 py-3.5 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {productos.map((p) => (
                <tr key={p.id} className="hover:bg-[#FDF8F6] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#F9E4E4] rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-[#D4A574]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#4A3F32]">{p.nombre}</p>
                        <p className="text-gray-400 text-xs">{p.descripcion?.slice(0, 40)}{p.descripcion?.length > 40 ? '…' : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs bg-[#F9E4E4] text-[#8B7355] px-2.5 py-1 rounded-full capitalize font-medium">{p.categoria}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-[#4A3F32]">${parseFloat(String(p.precio)).toFixed(2)}</p>
                    <p className="text-xs text-gray-400">Margen {margen(p)}%</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {p.stock === 0
                        ? <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Agotado</span>
                        : p.stock <= 3
                          ? <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{p.stock}</span>
                          : <span className="text-sm font-semibold text-gray-700">{p.stock}</span>
                      }
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1.5 flex-wrap">
                      {p.activo && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium">Activo</span>}
                      {p.destacado && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">⭐ Destacado</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-[#F9E4E4] text-gray-400 hover:text-[#D4A574] transition-colors" title="Editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setConfirmDelete(p)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {productos.length === 0 && (
            <div className="text-center py-16">
              <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No hay productos</p>
              <p className="text-gray-300 text-sm mt-1">Crea tu primer producto con el botón de arriba</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal formulario ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl max-h-[92vh] overflow-hidden flex flex-col">

            {/* Header del modal */}
            <div className="px-7 pt-7 pb-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#D4A574] to-[#C4956A] rounded-2xl flex items-center justify-center shadow-md shadow-[#D4A574]/30">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#4A3F32]">{editing ? 'Editar producto' : 'Nuevo producto'}</h2>
                    <p className="text-xs text-gray-400">{editing ? 'Modifica los campos que necesites' : 'Completa la información del producto'}</p>
                  </div>
                </div>
                <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Cuerpo scrollable */}
            <div className="overflow-y-auto flex-1 px-7 py-5 space-y-5">

              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Nombre del producto *</label>
                <input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Shampoo de keratina 500ml"
                  className="w-full border-2 border-gray-100 focus:border-[#D4A574] rounded-2xl px-4 py-3 text-sm text-[#4A3F32] placeholder-gray-300 outline-none transition-colors font-medium"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Describe brevemente el producto..."
                  rows={2}
                  className="w-full border-2 border-gray-100 focus:border-[#D4A574] rounded-2xl px-4 py-3 text-sm text-[#4A3F32] placeholder-gray-300 outline-none transition-colors resize-none"
                />
              </div>

              {/* Precio / Costo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Precio de venta *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                    <input
                      type="number" step="0.01" min="0"
                      value={form.precio}
                      onChange={(e) => setForm({ ...form, precio: e.target.value })}
                      placeholder="0.00"
                      className="w-full border-2 border-gray-100 focus:border-[#D4A574] rounded-2xl pl-8 pr-4 py-3 text-sm text-[#4A3F32] outline-none transition-colors font-semibold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Costo</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                    <input
                      type="number" step="0.01" min="0"
                      value={form.precio_costo}
                      onChange={(e) => setForm({ ...form, precio_costo: e.target.value })}
                      placeholder="0.00"
                      className="w-full border-2 border-gray-100 focus:border-[#D4A574] rounded-2xl pl-8 pr-4 py-3 text-sm text-[#4A3F32] outline-none transition-colors font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Margen visual */}
              {form.precio && form.precio_costo && parseFloat(form.precio) > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-2xl px-4 py-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-green-700">Margen de ganancia</span>
                  <span className="text-lg font-bold text-green-600">
                    {Math.round(((parseFloat(form.precio) - parseFloat(form.precio_costo)) / parseFloat(form.precio)) * 100)}%
                  </span>
                </div>
              )}

              {/* Stock */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cantidad en stock</label>
                <input
                  type="number" min="0"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className="w-full border-2 border-gray-100 focus:border-[#D4A574] rounded-2xl px-4 py-3 text-sm text-[#4A3F32] outline-none transition-colors font-semibold"
                />
              </div>

              {/* ── Categoría ──────────────────────────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoría *</label>
                  <button
                    type="button"
                    onClick={() => { setShowAgregarCat(!showAgregarCat); setNuevaCat(''); }}
                    className="flex items-center gap-1.5 text-xs text-[#D4A574] hover:text-[#C4956A] font-semibold transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                    Añadir nueva
                  </button>
                </div>

                {/* Input nueva categoría */}
                {showAgregarCat && (
                  <div className="mb-3 p-3 bg-[#FDF8F6] rounded-2xl border-2 border-dashed border-[#D4A574]/40">
                    <p className="text-xs text-[#8B7355] font-medium mb-2">Nueva categoría</p>
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={nuevaCat}
                        onChange={(e) => setNuevaCat(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); handleAgregarCategoria(); }
                          if (e.key === 'Escape') setShowAgregarCat(false);
                        }}
                        placeholder="Ej: accesorios, tintes, spa..."
                        className="flex-1 border-2 border-gray-100 focus:border-[#D4A574] rounded-xl px-3 py-2 text-sm outline-none bg-white transition-colors"
                      />
                      <button type="button" onClick={handleAgregarCategoria}
                        className="bg-[#D4A574] hover:bg-[#C4956A] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                        Crear
                      </button>
                    </div>
                  </div>
                )}

                {/* Lista seleccionable */}
                {categorias.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {categorias.map((cat) => {
                      const sel = form.categoria === cat;
                      return (
                        <div
                          key={cat}
                          onClick={() => setForm({ ...form, categoria: cat })}
                          className={`relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl cursor-pointer border-2 transition-all group
                            ${sel
                              ? 'bg-[#D4A574] border-[#D4A574] text-white shadow-md shadow-[#D4A574]/30'
                              : 'bg-white border-gray-100 text-gray-600 hover:border-[#D4A574]/40 hover:bg-[#FDF8F6]'}`}
                        >
                          {/* Check */}
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                            ${sel ? 'border-white bg-white/20' : 'border-gray-300'}`}>
                            {sel && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                          </div>
                          <span className="text-sm capitalize font-medium flex-1 truncate">{cat}</span>
                          {/* Eliminar */}
                          <button
                            type="button"
                            onClick={(e) => handleEliminarCategoria(cat, e)}
                            className={`opacity-0 group-hover:opacity-100 p-0.5 rounded-lg transition-all flex-shrink-0
                              ${sel ? 'text-white/60 hover:text-white hover:bg-white/20' : 'text-gray-300 hover:text-red-400 hover:bg-red-50'}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl py-8 text-center">
                    <Tag className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400 font-medium">Sin categorías aún</p>
                    <p className="text-xs text-gray-300 mt-1">Usa el botón "Añadir nueva" para crear</p>
                  </div>
                )}
              </div>

              {/* Checkboxes */}
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all
                  ${form.activo ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                  <input type="checkbox" checked={form.activo}
                    onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                    className="w-4 h-4 rounded accent-green-500" />
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Activo</p>
                    <p className="text-xs text-gray-400">Visible en tienda</p>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all
                  ${form.destacado ? 'border-yellow-200 bg-yellow-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                  <input type="checkbox" checked={form.destacado}
                    onChange={(e) => setForm({ ...form, destacado: e.target.checked })}
                    className="w-4 h-4 rounded accent-yellow-500" />
                  <div>
                    <p className="text-sm font-semibold text-gray-700">⭐ Destacado</p>
                    <p className="text-xs text-gray-400">Aparece primero</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Footer fijo */}
            <div className="px-7 py-5 border-t border-gray-100 bg-gray-50/50 flex gap-3">
              <button onClick={() => setShowForm(false)}
                className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-2xl text-sm font-semibold hover:bg-gray-100 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !form.nombre || !form.precio || !form.categoria || saved}
                className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md
                  ${saved
                    ? 'bg-green-500 text-white shadow-green-200'
                    : 'bg-[#D4A574] hover:bg-[#C4956A] text-white shadow-[#D4A574]/30 disabled:opacity-40'}`}
              >
                {saved
                  ? <><Check className="w-4 h-4" /> ¡Guardado!</>
                  : loading
                    ? 'Guardando...'
                    : editing ? 'Guardar cambios' : 'Crear producto'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmar eliminar ──────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-7 w-full max-w-sm shadow-2xl">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="font-bold text-[#4A3F32] text-center text-lg mb-1">¿Eliminar producto?</h2>
            <p className="text-gray-400 text-center text-sm mb-1">{confirmDelete.nombre}</p>
            <p className="text-gray-300 text-center text-xs mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 border-2 border-gray-100 text-gray-600 py-3 rounded-2xl font-semibold hover:bg-gray-50 text-sm transition-colors">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                {deleting ? 'Eliminando...' : <><Trash2 className="w-4 h-4" /> Eliminar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}