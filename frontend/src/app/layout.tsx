import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Yalinnette Hair & Beauty Artist | Caguas, Puerto Rico',
  description: 'Tu Estilista de belleza profesional en Caguas, Puerto Rico. Reserva tu cita hoy. Martes a Sábado 9AM - 6PM.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body suppressHydrationWarning={true}>{children}</body>
    </html>
  );
}
