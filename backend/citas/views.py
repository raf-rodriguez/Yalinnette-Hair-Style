"""
JWT Authentication Views
Login, refresh token, logout y cambio de contraseña
"""
from django.contrib.auth import authenticate
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Count, Q
from django.conf import settings
from datetime import datetime, timedelta, date
import qrcode
import io
import base64
import uuid

from .models import Servicio, Producto, Clienta, Cita, Bloqueo, Orden, OrdenItem, Pago
from .serializers import (
    ServicioSerializer, ProductoSerializer, ClientaSerializer,
    CitaSerializer, BloqueoSerializer, OrdenSerializer, OrdenItemSerializer, PagoSerializer
)
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
import logging

logger = logging.getLogger(__name__)


class ServicioViewSet(viewsets.ModelViewSet):
    queryset = Servicio.objects.filter(activo=True)
    serializer_class = ServicioSerializer

    def get_queryset(self):
        qs = Servicio.objects.all()
        activo = self.request.query_params.get('activo')
        if activo == 'true':
            qs = qs.filter(activo=True)
        return qs


class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.filter(activo=True)
    serializer_class = ProductoSerializer

    def get_queryset(self):
        qs = Producto.objects.all()
        categoria = self.request.query_params.get('categoria')
        destacado = self.request.query_params.get('destacado')
        activo = self.request.query_params.get('activo')

        if categoria:
            qs = qs.filter(categoria=categoria)
        if destacado == 'true':
            qs = qs.filter(destacado=True)
        if activo == 'true':
            qs = qs.filter(activo=True)
        return qs


class ClientaViewSet(viewsets.ModelViewSet):
    queryset = Clienta.objects.all()
    serializer_class = ClientaSerializer

    def get_queryset(self):
        qs = Clienta.objects.all()
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(nombre__icontains=search) | Q(telefono__icontains=search))
        return qs

    @action(detail=True, methods=['get'])
    def historial(self, request, pk=None):
        clienta = self.get_object()
        citas = Cita.objects.filter(clienta=clienta).order_by('-fecha_hora')[:10]
        ordenes = Orden.objects.filter(clienta=clienta).order_by('-creada')[:10]
        return Response({
            'citas': CitaSerializer(citas, many=True).data,
            'ordenes': OrdenSerializer(ordenes, many=True).data,
        })


class CitaViewSet(viewsets.ModelViewSet):
    queryset = Cita.objects.all()
    serializer_class = CitaSerializer

    def get_queryset(self):
        qs = Cita.objects.select_related('servicio', 'clienta').all()
        estado = self.request.query_params.get('estado')
        fecha = self.request.query_params.get('fecha')
        fecha_inicio = self.request.query_params.get('fecha_inicio')
        fecha_fin = self.request.query_params.get('fecha_fin')

        if estado:
            qs = qs.filter(estado=estado)
        if fecha:
            qs = qs.filter(fecha_hora__date=fecha)
        if fecha_inicio:
            qs = qs.filter(fecha_hora__date__gte=fecha_inicio)
        if fecha_fin:
            qs = qs.filter(fecha_hora__date__lte=fecha_fin)
        return qs

    def create(self, request, *args, **kwargs):
        data = request.data.copy()

        # Find or create clienta
        telefono = data.get('telefono')
        nombre = data.get('nombre')
        if telefono:
            clienta, created = Clienta.objects.get_or_create(
                telefono=telefono,
                defaults={'nombre': nombre, 'email': data.get('email', '')}
            )
            data['clienta'] = clienta.id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        cita = serializer.save()

        # Update clienta stats
        if cita.clienta:
            clienta = cita.clienta
            clienta.total_visitas = Cita.objects.filter(clienta=clienta, estado='completada').count()
            clienta.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def confirmar(self, request, pk=None):
        cita = self.get_object()
        cita.estado = 'confirmada'
        cita.pagado = True
        cita.save()

        # Send WhatsApp notification
        try:
            send_whatsapp_confirmation(cita)
        except Exception:
            pass

        return Response(CitaSerializer(cita).data)

    @action(detail=True, methods=['post'])
    def completar(self, request, pk=None):
        cita = self.get_object()
        cita.estado = 'completada'
        cita.save()

        # Update clienta stats
        if cita.clienta:
            clienta = cita.clienta
            clienta.total_visitas = Cita.objects.filter(clienta=clienta, estado='completada').count()
            clienta.total_gastado = Cita.objects.filter(
                clienta=clienta, estado='completada'
            ).aggregate(total=Sum('monto_total'))['total'] or 0
            clienta.save()

        return Response(CitaSerializer(cita).data)

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        cita = self.get_object()
        cita.estado = 'cancelada'
        cita.save()
        return Response(CitaSerializer(cita).data)

    @action(detail=True, methods=['get'])
    def qr(self, request, pk=None):
        cita = self.get_object()
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(f"CITA:{cita.codigo_qr}|{cita.nombre}|{cita.servicio.nombre}|{cita.fecha_hora.strftime('%Y-%m-%d %H:%M')}")
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        return Response({'qr': f"data:image/png;base64,{img_str}"})


class BloqueoViewSet(viewsets.ModelViewSet):
    queryset = Bloqueo.objects.all()
    serializer_class = BloqueoSerializer

    def get_queryset(self):
        qs = Bloqueo.objects.all()
        fecha = self.request.query_params.get('fecha')
        mes = self.request.query_params.get('mes')
        year = self.request.query_params.get('year')

        if fecha:
            qs = qs.filter(fecha=fecha)
        if mes and year:
            qs = qs.filter(fecha__month=mes, fecha__year=year)
        return qs


class OrdenViewSet(viewsets.ModelViewSet):
    queryset = Orden.objects.all()
    serializer_class = OrdenSerializer

    def get_queryset(self):
        qs = Orden.objects.prefetch_related('items__producto').all()
        estado = self.request.query_params.get('estado')
        if estado:
            qs = qs.filter(estado=estado)
        return qs

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        items_data = data.pop('items', [])

        # Find or create clienta
        telefono = data.get('telefono_cliente')
        nombre = data.get('nombre_cliente')
        if telefono:
            clienta, _ = Clienta.objects.get_or_create(
                telefono=telefono,
                defaults={'nombre': nombre, 'email': data.get('email_cliente', '')}
            )
            data['clienta'] = clienta.id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        orden = serializer.save()

        # Create order items
        subtotal = 0
        for item in items_data:
            producto = Producto.objects.get(id=item['producto_id'])
            precio_unit = producto.precio
            cantidad = item.get('cantidad', 1)
            item_subtotal = precio_unit * cantidad
            subtotal += item_subtotal

            OrdenItem.objects.create(
                orden=orden,
                producto=producto,
                cantidad=cantidad,
                precio_unit=precio_unit,
                subtotal=item_subtotal
            )

            # Reduce stock
            if producto.stock >= cantidad:
                producto.stock -= cantidad
                producto.save()

        orden.subtotal = subtotal
        orden.total = subtotal
        orden.save()

        return Response(OrdenSerializer(orden).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def confirmar_pago(self, request, pk=None):
        orden = self.get_object()
        referencia = request.data.get('referencia', '')
        orden.estado = 'pagada'
        orden.referencia_pago = referencia
        orden.save()
        return Response(OrdenSerializer(orden).data)

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        orden = self.get_object()
        orden.estado = 'cancelada'
        orden.save()
        # Restore stock
        for item in orden.items.all():
            producto = item.producto
            producto.stock += item.cantidad
            producto.save()
        return Response(OrdenSerializer(orden).data)


@api_view(['GET'])
def disponibilidad(request):
    """Returns available time slots for a given date and service."""
    fecha_str = request.query_params.get('fecha')
    servicio_id = request.query_params.get('servicio_id')

    if not fecha_str or not servicio_id:
        return Response({'error': 'fecha y servicio_id son requeridos'}, status=400)

    try:
        fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
        servicio = Servicio.objects.get(id=servicio_id, activo=True)
    except (ValueError, Servicio.DoesNotExist):
        return Response({'error': 'Fecha o servicio inválido'}, status=400)

    # Check if date is Sunday (0=Mon, 6=Sun) or day before salon opens (Mon=0)
    if fecha.weekday() == 6 or fecha.weekday() == 0:  # Sunday or Monday
        return Response({'slots': [], 'bloqueado': False, 'motivo': 'El salón está cerrado este día'})

    # Check full-day blocks
    bloqueo_dia = Bloqueo.objects.filter(fecha=fecha, todo_el_dia=True).first()
    if bloqueo_dia:
        return Response({'slots': [], 'bloqueado': True, 'motivo': bloqueo_dia.motivo})

    # Generate slots 9am - 6pm
    slots = []
    hora_inicio = 9
    hora_fin = 18
    duracion = servicio.duracion_minutos

    bloqueos_hora = Bloqueo.objects.filter(fecha=fecha, todo_el_dia=False)
    citas_dia = Cita.objects.filter(
        fecha_hora__date=fecha,
        estado__in=['pendiente', 'confirmada']
    )

    current_time = datetime.combine(fecha, datetime.min.time()).replace(hour=hora_inicio)
    end_time = datetime.combine(fecha, datetime.min.time()).replace(hour=hora_fin)

    while current_time + timedelta(minutes=duracion) <= end_time:
        hora = current_time.time()
        hora_fin_slot = (current_time + timedelta(minutes=duracion)).time()

        # Check if blocked
        bloqueado = False
        for bloqueo in bloqueos_hora:
            if bloqueo.hora_inicio and bloqueo.hora_fin:
                if not (hora_fin_slot <= bloqueo.hora_inicio or hora >= bloqueo.hora_fin):
                    bloqueado = True
                    break

        # Check if occupied by another appointment
        ocupado = False
        for cita in citas_dia:
            cita_inicio = cita.fecha_hora.time()
            cita_fin = (cita.fecha_hora + timedelta(minutes=cita.servicio.duracion_minutos)).time()
            if not (hora_fin_slot <= cita_inicio or hora >= cita_fin):
                ocupado = True
                break

        slots.append({
            'hora': hora.strftime('%H:%M'),
            'hora_fin': hora_fin_slot.strftime('%H:%M'),
            'disponible': not bloqueado and not ocupado,
        })
        current_time += timedelta(minutes=30)

    return Response({'slots': slots, 'bloqueado': False})


@api_view(['GET'])
def stats(request):
    """Returns dashboard statistics."""
    hoy = date.today()
    inicio_semana = hoy - timedelta(days=hoy.weekday())
    inicio_mes = hoy.replace(day=1)

    # Citas
    total_citas = Cita.objects.count()
    citas_hoy = Cita.objects.filter(fecha_hora__date=hoy).count()
    citas_semana = Cita.objects.filter(fecha_hora__date__gte=inicio_semana).count()
    citas_mes = Cita.objects.filter(fecha_hora__date__gte=inicio_mes).count()

    # Ingresos (depósitos pagados)
    ingresos_mes = Cita.objects.filter(
        fecha_hora__date__gte=inicio_mes, pagado=True
    ).aggregate(total=Sum('monto_deposito'))['total'] or 0

    ingresos_ordenes_mes = Orden.objects.filter(
        creada__date__gte=inicio_mes, estado='pagada'
    ).aggregate(total=Sum('total'))['total'] or 0

    # Estado de citas
    por_estado = Cita.objects.values('estado').annotate(count=Count('id'))

    # Servicios populares
    servicios_populares = Cita.objects.values(
        'servicio__nombre'
    ).annotate(count=Count('id')).order_by('-count')[:5]

    # Citas próximas
    citas_proximas = Cita.objects.filter(
        fecha_hora__gte=timezone.now(),
        estado__in=['pendiente', 'confirmada']
    ).select_related('servicio').order_by('fecha_hora')[:5]

    return Response({
        'total_citas': total_citas,
        'citas_hoy': citas_hoy,
        'citas_semana': citas_semana,
        'citas_mes': citas_mes,
        'ingresos_depositos_mes': float(ingresos_mes),
        'ingresos_productos_mes': float(ingresos_ordenes_mes),
        'ingresos_totales_mes': float(ingresos_mes + ingresos_ordenes_mes),
        'por_estado': list(por_estado),
        'servicios_populares': list(servicios_populares),
        'citas_proximas': CitaSerializer(citas_proximas, many=True).data,
        'total_clientas': Clienta.objects.count(),
        'total_productos': Producto.objects.filter(activo=True).count(),
        'ordenes_pendientes': Orden.objects.filter(estado='pendiente').count(),
    })


@api_view(['GET'])
def reportes_mensuales(request):
    """Returns monthly report data for charts."""
    year = int(request.query_params.get('year', date.today().year))

    data = []
    for mes in range(1, 13):
        citas_mes = Cita.objects.filter(fecha_hora__year=year, fecha_hora__month=mes)
        ordenes_mes = Orden.objects.filter(creada__year=year, creada__month=mes, estado='pagada')

        ingresos_citas = citas_mes.filter(pagado=True).aggregate(
            total=Sum('monto_deposito'))['total'] or 0
        ingresos_ordenes = ordenes_mes.aggregate(total=Sum('total'))['total'] or 0

        data.append({
            'mes': mes,
            'nombre_mes': ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                          'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][mes - 1],
            'citas': citas_mes.count(),
            'ordenes': ordenes_mes.count(),
            'ingresos_citas': float(ingresos_citas),
            'ingresos_ordenes': float(ingresos_ordenes),
            'ingresos_total': float(ingresos_citas + ingresos_ordenes),
        })

    return Response(data)


@api_view(['POST'])
def seed_data(request):
    """Seeds initial sample data."""
    if Servicio.objects.exists():
        return Response({'message': 'Data already exists'})

    servicios = [
        {'nombre': 'Corte de Cabello', 'descripcion': 'Corte profesional adaptado a tu estilo', 'precio': 25.00, 'duracion_minutos': 60},
        {'nombre': 'Manicure Completa', 'descripcion': 'Limpieza, forma y esmalte de uñas', 'precio': 20.00, 'duracion_minutos': 45},
        {'nombre': 'Pedicure Spa', 'descripcion': 'Tratamiento completo de pies y uñas', 'precio': 30.00, 'duracion_minutos': 60},
        {'nombre': 'Uñas Acrílicas', 'descripcion': 'Extensión y decoración de uñas acrílicas', 'precio': 45.00, 'duracion_minutos': 90},
        {'nombre': 'Tinte de Cabello', 'descripcion': 'Coloración completa del cabello', 'precio': 60.00, 'duracion_minutos': 120},
        {'nombre': 'Mechas / Highlights', 'descripcion': 'Mechas balayage o tradicionales', 'precio': 80.00, 'duracion_minutos': 150},
        {'nombre': 'Tratamiento Facial', 'descripcion': 'Limpieza facial profunda y nutrición', 'precio': 40.00, 'duracion_minutos': 60},
        {'nombre': 'Maquillaje Profesional', 'descripcion': 'Maquillaje para eventos especiales', 'precio': 35.00, 'duracion_minutos': 60},
        {'nombre': 'Peinado para Eventos', 'descripcion': 'Peinados elegantes para bodas y eventos', 'precio': 40.00, 'duracion_minutos': 60},
        {'nombre': 'Depilación de Cejas', 'descripcion': 'Diseño y depilación profesional', 'precio': 12.00, 'duracion_minutos': 20},
    ]

    for s in servicios:
        Servicio.objects.create(**s)

    productos = [
        {'nombre': 'Shampoo Hidratante Premium', 'descripcion': 'Para cabello seco y dañado', 'precio': 18.99, 'precio_costo': 8.00, 'stock': 20, 'categoria': 'cabello', 'destacado': True},
        {'nombre': 'Acondicionador Reparador', 'descripcion': 'Repara y nutre intensamente', 'precio': 16.99, 'precio_costo': 7.00, 'stock': 15, 'categoria': 'cabello'},
        {'nombre': 'Sérum Anti-Frizz', 'descripcion': 'Control del frizz y brillo', 'precio': 22.99, 'precio_costo': 10.00, 'stock': 12, 'categoria': 'cabello', 'destacado': True},
        {'nombre': 'Mascarilla Capilar', 'descripcion': 'Tratamiento profundo semanal', 'precio': 25.99, 'precio_costo': 11.00, 'stock': 8, 'categoria': 'cabello'},
        {'nombre': 'Esmalte Gel UV', 'descripcion': 'Colores vibrantes larga duración', 'precio': 12.99, 'precio_costo': 5.00, 'stock': 30, 'categoria': 'manos'},
        {'nombre': 'Base Fortalecedora', 'descripcion': 'Protege y fortalece las uñas', 'precio': 9.99, 'precio_costo': 4.00, 'stock': 25, 'categoria': 'manos'},
        {'nombre': 'Crema Facial Hidratante', 'descripcion': 'Hidratación 24 horas', 'precio': 29.99, 'precio_costo': 13.00, 'stock': 10, 'categoria': 'facial', 'destacado': True},
        {'nombre': 'Sérum Vitamina C', 'descripcion': 'Ilumina y unifica el tono', 'precio': 34.99, 'precio_costo': 15.00, 'stock': 8, 'categoria': 'facial'},
        {'nombre': 'Base de Maquillaje SPF30', 'descripcion': 'Cobertura natural con protección solar', 'precio': 27.99, 'precio_costo': 12.00, 'stock': 12, 'categoria': 'maquillaje'},
        {'nombre': 'Paleta de Sombras', 'descripcion': '18 tonos para todos los looks', 'precio': 32.99, 'precio_costo': 14.00, 'stock': 7, 'categoria': 'maquillaje', 'destacado': True},
    ]

    for p in productos:
        Producto.objects.create(**p)

    return Response({'message': 'Data seeded successfully', 'servicios': len(servicios), 'productos': len(productos)})


def send_whatsapp_confirmation(cita):
    """Sends WhatsApp confirmation via Twilio."""
    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        mensaje = (
            f"✨ ¡Hola {cita.nombre}! Tu cita ha sido CONFIRMADA.\n\n"
            f"💅 Servicio: {cita.servicio.nombre}\n"
            f"📅 Fecha: {cita.fecha_hora.strftime('%d/%m/%Y')}\n"
            f"⏰ Hora: {cita.fecha_hora.strftime('%I:%M %p')}\n"
            f"📍 Caguas, Puerto Rico\n"
            f"🔑 Código: {cita.codigo_qr}\n\n"
            f"¡Te esperamos! ☎️ 787-718-7189"
        )

        client.messages.create(
            from_=settings.TWILIO_WHATSAPP_FROM,
            body=mensaje,
            to=f"whatsapp:+1{cita.telefono.replace('-', '').replace(' ', '')}"
        )
    except Exception as e:
        print(f"WhatsApp error: {e}")

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    POST /api/auth/login/
    Body: { "username": "admin", "password": "..." }
    Returns: { access, refresh, user: { id, username, email } }
    """
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')

    if not username or not password:
        return Response(
            {'error': 'Usuario y contraseña son requeridos.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = authenticate(username=username, password=password)

    if user is None:
        logger.warning(f"[Auth] Intento fallido para usuario: {username}")
        return Response(
            {'error': 'Usuario o contraseña incorrectos.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if not user.is_active:
        return Response(
            {'error': 'Cuenta desactivada. Contacta al administrador.'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Generar tokens JWT
    refresh = RefreshToken.for_user(user)
    access = refresh.access_token

    logger.info(f"[Auth] Login exitoso: {username}")

    return Response({
        'access': str(access),
        'refresh': str(refresh),
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
        }
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_view(request):
    """
    POST /api/auth/refresh/
    Body: { "refresh": "..." }
    Returns: { access }
    """
    refresh_token = request.data.get('refresh')
    if not refresh_token:
        return Response({'error': 'Token requerido.'}, status=400)

    try:
        refresh = RefreshToken(refresh_token)
        return Response({'access': str(refresh.access_token)})
    except TokenError:
        return Response({'error': 'Token inválido o expirado.'}, status=401)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    POST /api/auth/logout/
    Header: Authorization: Bearer <access_token>
    Body: { "refresh": "..." }
    Invalida el refresh token.
    """
    refresh_token = request.data.get('refresh')
    if refresh_token:
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()  # Requiere BLACKLIST_AFTER_ROTATION=True
        except TokenError:
            pass  # Token ya inválido, no es error

    return Response({'success': True, 'message': 'Sesión cerrada correctamente.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """
    GET /api/auth/me/
    Retorna info del usuario autenticado.
    """
    return Response({
        'id': request.user.id,
        'username': request.user.username,
        'email': request.user.email,
        'is_staff': request.user.is_staff,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    """
    POST /api/auth/change-password/
    Body: { "current_password": "...", "new_password": "..." }
    """
    current = request.data.get('current_password', '')
    new_pass = request.data.get('new_password', '')

    if not current or not new_pass:
        return Response({'error': 'Ambas contraseñas son requeridas.'}, status=400)

    if len(new_pass) < 8:
        return Response({'error': 'La contraseña debe tener al menos 8 caracteres.'}, status=400)

    user = authenticate(username=request.user.username, password=current)
    if user is None:
        return Response({'error': 'Contraseña actual incorrecta.'}, status=401)

    user.set_password(new_pass)
    user.save()

    # Invalidar tokens actuales para forzar nuevo login
    RefreshToken.for_user(user)

    logger.info(f"[Auth] Contraseña cambiada: {request.user.username}")
    return Response({'success': True, 'message': 'Contraseña actualizada. Inicia sesión de nuevo.'})