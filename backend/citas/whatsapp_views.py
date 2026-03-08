"""
Webhook de WhatsApp (Twilio)
Recibe mensajes entrantes y responde automáticamente
"""
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .whatsapp_bot import process_message, send_whatsapp
import logging

logger = logging.getLogger(__name__)


@csrf_exempt
@require_POST
def whatsapp_webhook(request):
    """
    Endpoint que Twilio llama cuando llega un mensaje de WhatsApp.
    URL: POST /api/whatsapp/webhook/
    """
    try:
        # Twilio envía los datos como form data
        from_number = request.POST.get('From', '')   # whatsapp:+17871234567
        body = request.POST.get('Body', '').strip()

        logger.info(f"[WhatsApp] From: {from_number} | Message: {body}")

        if not from_number or not body:
            return HttpResponse("OK", status=200)

        # Procesar mensaje y obtener respuesta
        respuesta = process_message(from_number, body)

        # Enviar respuesta
        send_whatsapp(from_number, respuesta)

        # Twilio espera un 200 con TwiML vacío o texto OK
        return HttpResponse("OK", status=200)

    except Exception as e:
        logger.error(f"[WhatsApp Webhook Error] {e}")
        return HttpResponse("OK", status=200)  # Siempre 200 para Twilio


@api_view(['POST'])
def send_notification(request):
    """
    Endpoint para enviar notificaciones manuales desde el dashboard.
    Body: { "telefono": "787xxxxxxx", "mensaje": "..." }
    """
    telefono = request.data.get('telefono', '')
    mensaje = request.data.get('mensaje', '')

    if not telefono or not mensaje:
        return Response({'error': 'telefono y mensaje son requeridos'}, status=400)

    # Normalizar número
    numero_limpio = telefono.replace('-', '').replace(' ', '').replace('+', '')
    if not numero_limpio.startswith('1'):
        numero_limpio = '1' + numero_limpio
    whatsapp_number = f'whatsapp:+{numero_limpio}'

    send_whatsapp(whatsapp_number, mensaje)
    return Response({'success': True, 'to': whatsapp_number})


@api_view(['POST'])
def send_reminder(request, cita_id):
    """Envía recordatorio de cita específica."""
    from .models import Cita
    try:
        cita = Cita.objects.get(id=cita_id)
        fecha = cita.fecha_hora
        h = fecha.hour
        ampm = 'AM' if h < 12 else 'PM'
        h12 = h if h <= 12 else h - 12

        mensaje = (
            f"⏰ *Recordatorio de Cita*\n\n"
            f"Hola *{cita.nombre}*, te recordamos tu cita de mañana:\n\n"
            f"💅 {cita.servicio.nombre}\n"
            f"📅 {fecha.strftime('%d/%m/%Y')}\n"
            f"⏰ {h12}:{fecha.minute:02d} {ampm}\n"
            f"📍 Caguas, Puerto Rico\n\n"
            f"🔑 Código: {cita.codigo_qr}\n\n"
            f"¿Necesitas cancelar o cambiar? Escríbenos aquí 😊"
        )

        numero_limpio = cita.telefono.replace('-', '').replace(' ', '')
        if not numero_limpio.startswith('1'):
            numero_limpio = '1' + numero_limpio
        send_whatsapp(f'whatsapp:+{numero_limpio}', mensaje)

        cita.recordatorio_enviado = True
        cita.save()

        return Response({'success': True})
    except Cita.DoesNotExist:
        return Response({'error': 'Cita no encontrada'}, status=404)
