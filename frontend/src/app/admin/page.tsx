'use client';
import { useEffect, useState } from 'react';
import { Calendar, Users, DollarSign, ShoppingBag, TrendingUp, Clock } from 'lucide-react';
import { api } from '@/lib/api';

interface Stats {
  citas_hoy: number; citas_semana: number; citas_mes: number; total_clientas: number;
  ingresos_totales_mes: number; ingresos_depositos_mes: number; ingresos_productos_mes: number;
  ordenes_pendientes: number; total_productos: number;
  citas_proximas: any[]; por_estado: { estado: string; count: number }[];
  servicios_populares: { servicio__nombre: string; count: number }[];
}

const ESTADO_COLORS: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  confirmada: 'bg-blue-100 text-blue-700',
  completada: 'bg-green-100 text-green-700',
  cancelada: 'bg-red-100 text-red-700',
  expirada: 'bg-gray-100 text-gray-600',
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {});
  }, []);

  if (!stats) return <div className="text-center py-12 text-gray-400">Cargando dashboard...</div>;

  const statCards = [
    { label: 'Citas Hoy', value: stats.citas_hoy, icon: Calendar, color: 'bg-blue-50 text-blue-600' },
    { label: 'Citas este Mes', value: stats.citas_mes, icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
    { label: 'Clientas', value: stats.total_clientas, icon: Users, color: 'bg-pink-50 text-pink-600' },
    { label: 'Ingresos del Mes', value: `$${stats.ingresos_totales_mes.toFixed(2)}`, icon: DollarSign, color: 'bg-green-50 text-green-600' },
    { label: 'Órdenes Pendientes', value: stats.ordenes_pendientes, icon: ShoppingBag, color: 'bg-orange-50 text-orange-600' },
    { label: 'Citas esta Semana', value: stats.citas_semana, icon: Clock, color: 'bg-teal-50 text-teal-600' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#4A3F32] mb-6 font-display">Dashboard</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {statCards.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-[#4A3F32]">{s.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Próximas citas */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-[#4A3F32] mb-4">Próximas Citas</h2>
          {stats.citas_proximas.length === 0 ? (
            <p className="text-gray-400 text-sm">No hay citas próximas</p>
          ) : (
            <div className="space-y-3">
              {stats.citas_proximas.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="font-medium text-[#4A3F32] text-sm">{c.nombre}</p>
                    <p className="text-xs text-gray-400">{c.servicio_nombre}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{new Date(c.fecha_hora).toLocaleDateString('es')}</p>
                    <p className="text-xs text-[#D4A574] font-medium">{new Date(c.fecha_hora).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Por estado y servicios populares */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-[#4A3F32] mb-4">Citas por Estado</h2>
            <div className="space-y-2">
              {stats.por_estado.map((e) => (
                <div key={e.estado} className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded-full capitalize font-medium ${ESTADO_COLORS[e.estado] || 'bg-gray-100 text-gray-600'}`}>{e.estado}</span>
                  <span className="font-bold text-[#4A3F32]">{e.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-[#4A3F32] mb-4">Servicios Populares</h2>
            <div className="space-y-2">
              {stats.servicios_populares.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{s.servicio__nombre}</span>
                  <span className="font-bold text-[#D4A574]">{s.count} citas</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
