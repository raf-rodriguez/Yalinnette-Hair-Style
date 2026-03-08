# 💅 Yalinnette Hair & style App

Sistema completo de reservas y tienda para salón de belleza profesional en Caguas, Puerto Rico.

## Stack Tecnológico

- **Backend:** Django 5.0 + Django REST Framework
- **Frontend:** Next.js 14 + Tailwind CSS + Zustand
- **Base de Datos:** SQLite (desarrollo) / PostgreSQL (producción)
- **Pagos:** ATH Móvil + PayPal
- **Notificaciones:** Twilio (WhatsApp)

## Instalación Rápida

### Backend (Django)

```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Mac/Linux
venv\Scripts\activate      # Windows

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Edita .env con tus credenciales

# Crear base de datos y migraciones
python manage.py makemigrations
python manage.py migrate

# Crear superusuario para el admin de Django
python manage.py createsuperuser

# Iniciar servidor (puerto 8000)
python manage.py runserver
```

### Frontend (Next.js)

```bash
cd frontend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Edita .env.local si es necesario
npm run dev
# Iniciar servidor de desarrollo (puerto 3000)

```

### Cargar datos de ejemplo

1. Con el backend corriendo, visita: http://localhost:3000
2. Si no hay servicios, aparecerá un botón "Cargar datos de ejemplo"
3. O llama directamente: `POST http://localhost:8000/api/seed/`

## URLs

| URL | Descripción |
|-----|-------------|
| http://localhost:3000 | Página principal del salón |
| http://localhost:3000/booking | Reservar cita (paso a paso) |
| http://localhost:3000/tienda | Tienda de productos |
| http://localhost:3000/checkout | Checkout de productos |
| http://localhost:3000/admin | Panel de administración |
| http://localhost:8000/api/ | API REST (Django) |
| http://localhost:8000/admin/ | Admin Django |

## Panel de Administración

### Secciones del Admin (/admin):
- **Dashboard** – Estadísticas en tiempo real
- **Citas** – Gestión completa con filtros, crear/editar/cancelar
- **Servicios** – CRUD de servicios del salón
- **Productos** – CRUD con control de stock
- **Clientas** – Directorio con historial de citas y órdenes
- **Órdenes** – Gestión de pedidos con confirmación de pago
- **Reportes** – Gráficos de ingresos y estadísticas anuales

## Funcionalidades

### Para el Cliente
- ✅ Reserva de citas sin necesidad de cuenta
- ✅ Stepper intuitivo: Servicio → Fecha/Hora → Datos → Confirmación
- ✅ Slots de disponibilidad en tiempo real
- ✅ Código QR único por cita
- ✅ Depósito de $5.00 vía ATH Móvil o PayPal
- ✅ Tienda de productos con carrito
- ✅ Checkout con ATH Móvil / PayPal

### Para el Administrador
- ✅ Dashboard con estadísticas
- ✅ Gestión completa de citas
- ✅ CRUD de servicios y productos
- ✅ Historial de clientas
- ✅ Control de órdenes y pagos
- ✅ Reportes con gráficos (Recharts)
- ✅ Bloqueo de agenda

## API Endpoints

```
GET  /api/servicios/          – Lista servicios
POST /api/servicios/          – Crear servicio
GET  /api/citas/              – Lista citas (filtros: estado, fecha)
POST /api/citas/              – Crear cita
POST /api/citas/{id}/confirmar/   – Confirmar cita
POST /api/citas/{id}/completar/   – Completar cita
POST /api/citas/{id}/cancelar/    – Cancelar cita
GET  /api/citas/{id}/qr/          – Obtener QR de cita
GET  /api/disponibilidad/?fecha=&servicio_id=  – Slots disponibles
GET  /api/stats/              – Estadísticas del dashboard
GET  /api/reportes/mensuales/ – Datos para gráficos
GET  /api/productos/          – Lista productos
POST /api/ordenes/            – Crear orden
POST /api/ordenes/{id}/confirmar_pago/ – Confirmar pago
GET  /api/clientas/           – Lista clientas
GET  /api/clientas/{id}/historial/ – Historial de clienta
POST /api/seed/               – Cargar datos de ejemplo
```

## Configuración de Pagos

### ATH Móvil
El sistema genera un deep link `athm://pay?phone=7870000000&amount=X` que abre la app automáticamente.

### PayPal
Redirige a `paypal.me/BeautySalonPR/X`. Para configurar tu enlace PayPal.me, ve a paypal.me y crea tu enlace personalizado.

## Configuración de WhatsApp (Twilio)

1. Crea una cuenta en [Twilio](https://twilio.com)
2. Activa el sandbox de WhatsApp
3. Agrega tus credenciales en el `.env`:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxx
   TWILIO_AUTH_TOKEN=xxxxx
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   ```
