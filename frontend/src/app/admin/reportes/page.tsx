'use client';
import { useEffect, useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

const COLORS = ['#D4A574', '#B8856A', '#F9E4E4', '#8B7355', '#C4956A'];

export default function AdminReportesPage() {
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [downloading, setDownloading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getReportesMensuales(year).then(setData);
    api.getStats().then(setStats);
  }, [year]);

  const totalAnual = data.reduce((s, d) => s + d.ingresos_total, 0);
  const totalCitasAnual = data.reduce((s, d) => s + d.citas, 0);

  const handleDescargarCSV = () => {
    setDownloading(true);
    try {
      const headers = ['Mes', 'Citas', 'Ingresos Total', 'Ingresos Citas', 'Ingresos Órdenes'];
      const rows = data.map((d) => [
        d.nombre_mes,
        d.citas,
        d.ingresos_total.toFixed(2),
        d.ingresos_citas.toFixed(2),
        d.ingresos_ordenes.toFixed(2),
      ]);
      // Agregar fila de totales
      rows.push([
        'TOTAL',
        totalCitasAnual,
        totalAnual.toFixed(2),
        data.reduce((s, d) => s + d.ingresos_citas, 0).toFixed(2),
        data.reduce((s, d) => s + d.ingresos_ordenes, 0).toFixed(2),
      ]);

      const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `beauty-salon-reporte-${year}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const handleDescargarPDF = () => {
    window.print();
  };

  return (
    <div>
      {/* Header con botones de descarga */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-[#4A3F32] font-display">Reportes</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A574] bg-white">
            {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Botón descargar CSV */}
          <button onClick={handleDescargarCSV} disabled={downloading || data.length === 0}
            className="flex items-center gap-2 bg-[#4A3F32] hover:bg-[#3a3028] disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            CSV
          </button>

          {/* Botón imprimir/PDF */}
          <button onClick={handleDescargarPDF}
            className="flex items-center gap-2 bg-[#D4A574] hover:bg-[#C4956A] text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            <Download className="w-4 h-4" />
            PDF / Imprimir
          </button>
        </div>
      </div>

      <div ref={reportRef}>
        {/* Resumen anual */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-2xl font-bold text-[#D4A574]">${totalAnual.toFixed(2)}</p>
            <p className="text-sm text-gray-500 mt-0.5">Ingresos {year}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-2xl font-bold text-[#4A3F32]">{totalCitasAnual}</p>
            <p className="text-sm text-gray-500 mt-0.5">Citas {year}</p>
          </div>
          {stats && (
            <>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                <p className="text-2xl font-bold text-[#4A3F32]">{stats.total_clientas}</p>
                <p className="text-sm text-gray-500 mt-0.5">Clientas</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                <p className="text-2xl font-bold text-[#D4A574]">${stats.ingresos_totales_mes?.toFixed(2)}</p>
                <p className="text-sm text-gray-500 mt-0.5">Ingresos Mes</p>
              </div>
            </>
          )}
        </div>

        {/* Gráficas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-[#4A3F32] mb-4">Ingresos Mensuales {year}</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data}>
                <XAxis dataKey="nombre_mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Ingresos']} />
                <Bar dataKey="ingresos_total" fill="#D4A574" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-[#4A3F32] mb-4">Citas Mensuales {year}</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data}>
                <XAxis dataKey="nombre_mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="citas" stroke="#D4A574" strokeWidth={2} dot={{ fill: '#D4A574' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-[#4A3F32] mb-4">Desglose por Tipo de Ingreso</h2>
            {data.length > 0 && (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={[
                    { name: 'Depósitos Citas', value: data.reduce((s, d) => s + d.ingresos_citas, 0) },
                    { name: 'Venta Productos', value: data.reduce((s, d) => s + d.ingresos_ordenes, 0) },
                  ]} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                    {[0, 1].map((i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {stats?.servicios_populares?.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-[#4A3F32] mb-4">Servicios Más Populares</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.servicios_populares} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="servicio__nombre" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#B8856A" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Tabla detallada para el CSV/PDF */}
        {data.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-[#4A3F32]">Detalle Mensual {year}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Mes</th>
                    <th className="px-4 py-3 text-right">Citas</th>
                    <th className="px-4 py-3 text-right">Ing. Citas</th>
                    <th className="px-4 py-3 text-right">Ing. Productos</th>
                    <th className="px-4 py-3 text-right font-bold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.map((d) => (
                    <tr key={d.nombre_mes} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-[#4A3F32]">{d.nombre_mes}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{d.citas}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">${d.ingresos_citas?.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">${d.ingresos_ordenes?.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-[#D4A574]">${d.ingresos_total?.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="bg-[#F9E4E4] font-bold">
                    <td className="px-4 py-2.5 text-[#4A3F32]">TOTAL</td>
                    <td className="px-4 py-2.5 text-right text-[#4A3F32]">{totalCitasAnual}</td>
                    <td className="px-4 py-2.5 text-right text-[#4A3F32]">${data.reduce((s, d) => s + d.ingresos_citas, 0).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right text-[#4A3F32]">${data.reduce((s, d) => s + d.ingresos_ordenes, 0).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right text-[#D4A574]">${totalAnual.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Estilos para impresión */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #__next * { visibility: hidden; }
          [data-print="report"], [data-print="report"] * { visibility: visible; }
        }
      `}</style>
    </div>
  );
}