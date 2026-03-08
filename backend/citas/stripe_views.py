"""
Stripe Payment Integration
Maneja PaymentIntents para citas (depósito $5) y órdenes de productos
"""
import stripe
import json
import logging
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Cita, Orden, OrdenItem, Pago, Clienta, Servicio, Producto

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY


# ─── 1. Crear PaymentIntent para DEPÓSITO de cita ────────────────────────────

@api_view(['POST'])
def crear_payment_intent_cita(request):
    """
    Crea un PaymentIntent de Stripe para el depósito de $5 de una cita.

    Body esperado:
    {
        "nombre": "María López",
        "telefono": "787-123-4567",
        "email": "maria@email.com",          # opcional
        "servicio_id": 3,
        "fecha_hora": "2025-08-15T10:00:00",
        "notas": ""                           # opcional
    }
    Retorna: { client_secret, cita_id, monto }
    """
    try:
        data = request.data
        servicio = Servicio.objects.get(id=data['servicio_id'], activo=True)

        # Crear o encontrar clienta
        clienta, _ = Clienta.objects.get_or_create(
            telefono=data['telefono'],
            defaults={'nombre': data['nombre'], 'email': data.get('email', '')}
        )

        # Crear la cita en estado 'pendiente' (sin confirmar aún)
        cita = Cita.objects.create(
            clienta=clienta,
            nombre=data['nombre'],
            telefono=data['telefono'],
            email=data.get('email', ''),
            servicio=servicio,
            fecha_hora=data['fecha_hora'],
            monto_deposito=5.00,
            monto_total=servicio.precio,
            estado='pendiente',
            notas=data.get('notas', '')
        )

        # Crear PaymentIntent en Stripe
        # Stripe trabaja en centavos (USD) → $5.00 = 500 centavos
        intent = stripe.PaymentIntent.create(
            amount=500,  # $5.00 depósito en centavos
            currency='usd',
            metadata={
                'tipo': 'deposito_cita',
                'cita_id': str(cita.id),
                'servicio': servicio.nombre,
                'cliente': data['nombre'],
                'telefono': data['telefono'],
            },
            description=f"Depósito - {servicio.nombre} - {data['nombre']}",
            receipt_email=data.get('email') or None,
            automatic_payment_methods={'enabled': True},
        )

        # Guardar referencia del intent en la BD
        Pago.objects.create(
            cita=cita,
            monto=5.00,
            metodo='stripe',
            estado='pendiente',
            referencia=intent.id,
        )

        return Response({
            'client_secret': intent.client_secret,
            'cita_id': cita.id,
            'codigo_qr': cita.codigo_qr,
            'monto': 5.00,
            'servicio': servicio.nombre,
        })

    except Servicio.DoesNotExist:
        return Response({'error': 'Servicio no encontrado'}, status=404)
    except KeyError as e:
        return Response({'error': f'Campo requerido: {str(e)}'}, status=400)
    except stripe.error.StripeError as e:
        logger.error(f"[Stripe Error] {e}")
        return Response({'error': str(e.user_message)}, status=400)
    except Exception as e:
        logger.error(f"[Error crear_payment_intent_cita] {e}")
        return Response({'error': 'Error interno del servidor'}, status=500)


# ─── 2. Crear PaymentIntent para ORDEN de productos ──────────────────────────

@api_view(['POST'])
def crear_payment_intent_orden(request):
    """
    Crea una Orden y un PaymentIntent de Stripe para el total de productos.

    Body esperado:
    {
        "nombre": "María López",
        "telefono": "787-123-4567",
        "email": "maria@email.com",
        "items": [
            { "producto_id": 1, "cantidad": 2 },
            { "producto_id": 5, "cantidad": 1 }
        ]
    }
    Retorna: { client_secret, orden_id, total }
    """
    try:
        data = request.data
        items_data = data.get('items', [])
        if not items_data:
            return Response({'error': 'El carrito está vacío'}, status=400)

        # Calcular total y verificar stock
        total = 0
        items_procesados = []
        for item in items_data:
            producto = Producto.objects.get(id=item['producto_id'], activo=True)
            cantidad = int(item['cantidad'])
            if producto.stock < cantidad:
                return Response({
                    'error': f'Stock insuficiente para {producto.nombre}. Disponible: {producto.stock}'
                }, status=400)
            subtotal = producto.precio * cantidad
            total += subtotal
            items_procesados.append({
                'producto': producto,
                'cantidad': cantidad,
                'precio_unit': producto.precio,
                'subtotal': subtotal,
            })

        # Crear o encontrar clienta
        clienta, _ = Clienta.objects.get_or_create(
            telefono=data['telefono'],
            defaults={'nombre': data['nombre'], 'email': data.get('email', '')}
        )

        # Crear Orden en la BD
        orden = Orden.objects.create(
            clienta=clienta,
            nombre_cliente=data['nombre'],
            telefono_cliente=data['telefono'],
            email_cliente=data.get('email', ''),
            subtotal=total,
            total=total,
            estado='pendiente',
            metodo_pago='stripe',
        )

        # Crear OrdenItems y reducir stock
        for item in items_procesados:
            OrdenItem.objects.create(
                orden=orden,
                producto=item['producto'],
                cantidad=item['cantidad'],
                precio_unit=item['precio_unit'],
                subtotal=item['subtotal'],
            )
            # Reservar stock
            item['producto'].stock -= item['cantidad']
            item['producto'].save()

        # Crear descripción legible para el comprobante
        descripcion_items = ', '.join(
            [f"{i['producto'].nombre} x{i['cantidad']}" for i in items_procesados]
        )

        # Crear PaymentIntent en Stripe
        monto_centavos = int(total * 100)  # Convertir a centavos
        intent = stripe.PaymentIntent.create(
            amount=monto_centavos,
            currency='usd',
            metadata={
                'tipo': 'orden_productos',
                'orden_id': str(orden.id),
                'cliente': data['nombre'],
                'telefono': data['telefono'],
            },
            description=f"Orden #{orden.id} - {descripcion_items}",
            receipt_email=data.get('email') or None,
            automatic_payment_methods={'enabled': True},
        )

        # Guardar referencia
        Pago.objects.create(
            orden=orden,
            monto=total,
            metodo='stripe',
            estado='pendiente',
            referencia=intent.id,
        )

        return Response({
            'client_secret': intent.client_secret,
            'orden_id': orden.id,
            'total': float(total),
        })

    except Producto.DoesNotExist:
        return Response({'error': 'Producto no encontrado'}, status=404)
    except KeyError as e:
        return Response({'error': f'Campo requerido: {str(e)}'}, status=400)
    except stripe.error.StripeError as e:
        logger.error(f"[Stripe Error] {e}")
        return Response({'error': str(e.user_message)}, status=400)
    except Exception as e:
        logger.error(f"[Error crear_payment_intent_orden] {e}")
        return Response({'error': 'Error interno del servidor'}, status=500)


# ─── 3. Confirmar pago exitoso (llamado desde el frontend) ───────────────────

@api_view(['POST'])
def confirmar_pago(request):
    """
    Confirma que el pago fue exitoso (llamado después de stripe.confirmPayment).

    Body: { "payment_intent_id": "pi_xxx", "tipo": "cita" | "orden" }
    """
    try:
        payment_intent_id = request.data.get('payment_intent_id')
        tipo = request.data.get('tipo')

        # Verificar con Stripe que el pago realmente fue exitoso
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)

        if intent.status != 'succeeded':
            return Response({
                'error': f'El pago no fue completado. Estado: {intent.status}'
            }, status=400)

        if tipo == 'cita':
            cita_id = intent.metadata.get('cita_id')
            cita = Cita.objects.get(id=cita_id)
            cita.estado = 'confirmada'
            cita.pagado = True
            cita.save()

            # Actualizar pago en BD
            Pago.objects.filter(referencia=payment_intent_id).update(estado='completado')

            return Response({
                'success': True,
                'tipo': 'cita',
                'cita_id': cita.id,
                'codigo_qr': cita.codigo_qr,
                'servicio': cita.servicio.nombre,
                'fecha_hora': cita.fecha_hora.isoformat(),
                'nombre': cita.nombre,
            })

        elif tipo == 'orden':
            orden_id = intent.metadata.get('orden_id')
            orden = Orden.objects.get(id=orden_id)
            orden.estado = 'pagada'
            orden.referencia_pago = payment_intent_id
            orden.save()

            Pago.objects.filter(referencia=payment_intent_id).update(estado='completado')

            return Response({
                'success': True,
                'tipo': 'orden',
                'orden_id': orden.id,
                'total': float(orden.total),
                'nombre': orden.nombre_cliente,
            })

        return Response({'error': 'Tipo de pago desconocido'}, status=400)

    except (Cita.DoesNotExist, Orden.DoesNotExist):
        return Response({'error': 'Registro no encontrado'}, status=404)
    except stripe.error.StripeError as e:
        return Response({'error': str(e.user_message)}, status=400)
    except Exception as e:
        logger.error(f"[Error confirmar_pago] {e}")
        return Response({'error': 'Error al confirmar pago'}, status=500)


# ─── 4. Webhook de Stripe (eventos automáticos) ───────────────────────────────

@csrf_exempt
@require_POST
def stripe_webhook(request):
    """
    Webhook que Stripe llama automáticamente cuando ocurren eventos.
    URL: POST /api/stripe/webhook/

    Eventos manejados:
    - payment_intent.succeeded  → confirmar cita o orden
    - payment_intent.payment_failed → marcar pago como fallido
    """
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        logger.error("[Stripe Webhook] Payload inválido")
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError:
        logger.error("[Stripe Webhook] Firma inválida")
        return HttpResponse(status=400)

    intent = event.data.object

    if event.type == 'payment_intent.succeeded':
        logger.info(f"[Stripe] Pago exitoso: {intent.id}")
        _procesar_pago_exitoso(intent)

    elif event.type == 'payment_intent.payment_failed':
        logger.warning(f"[Stripe] Pago fallido: {intent.id}")
        _procesar_pago_fallido(intent)

    return HttpResponse(status=200)


def _procesar_pago_exitoso(intent):
    """Lógica interna para webhook de pago exitoso."""
    try:
        tipo = intent.metadata.get('tipo')
        Pago.objects.filter(referencia=intent.id).update(estado='completado')

        if tipo == 'deposito_cita':
            cita_id = intent.metadata.get('cita_id')
            Cita.objects.filter(id=cita_id, estado='pendiente').update(
                estado='confirmada', pagado=True
            )
        elif tipo == 'orden_productos':
            orden_id = intent.metadata.get('orden_id')
            Orden.objects.filter(id=orden_id, estado='pendiente').update(
                estado='pagada', referencia_pago=intent.id
            )
    except Exception as e:
        logger.error(f"[_procesar_pago_exitoso] {e}")


def _procesar_pago_fallido(intent):
    """Lógica interna para webhook de pago fallido."""
    try:
        Pago.objects.filter(referencia=intent.id).update(estado='fallido')

        tipo = intent.metadata.get('tipo')
        if tipo == 'orden_productos':
            # Restaurar stock si el pago falló
            orden_id = intent.metadata.get('orden_id')
            try:
                orden = Orden.objects.get(id=orden_id)
                for item in orden.items.all():
                    item.producto.stock += item.cantidad
                    item.producto.save()
                orden.estado = 'cancelada'
                orden.save()
            except Orden.DoesNotExist:
                pass
    except Exception as e:
        logger.error(f"[_procesar_pago_fallido] {e}")