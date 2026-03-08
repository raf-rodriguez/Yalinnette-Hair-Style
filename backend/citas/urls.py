"""
citas/urls.py
Todas las rutas de la app: API, WhatsApp, Stripe y Auth JWT
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .auth_views import login_view, refresh_view, logout_view, me_view, change_password_view
from .whatsapp_views import whatsapp_webhook, send_notification, send_reminder
from .stripe_views import (
    crear_payment_intent_cita,
    crear_payment_intent_orden,
    confirmar_pago,
    stripe_webhook,
)

router = DefaultRouter()
router.register('servicios', views.ServicioViewSet, basename='servicio')
router.register('productos', views.ProductoViewSet, basename='producto')
router.register('clientas', views.ClientaViewSet, basename='clienta')
router.register('citas', views.CitaViewSet, basename='cita')
router.register('bloqueos', views.BloqueoViewSet, basename='bloqueo')
router.register('ordenes', views.OrdenViewSet, basename='orden')

urlpatterns = [
    # ─── ViewSets ─────────────────────────────────────────────────────────────
    path('', include(router.urls)),

    # ─── Utilidades ───────────────────────────────────────────────────────────
    path('disponibilidad/', views.disponibilidad, name='disponibilidad'),
    path('stats/', views.stats, name='stats'),
    path('reportes/mensuales/', views.reportes_mensuales, name='reportes-mensuales'),
    path('seed/', views.seed_data, name='seed'),

    # ─── Auth JWT ─────────────────────────────────────────────────────────────
    path('auth/login/', login_view, name='auth-login'),
    path('auth/refresh/', refresh_view, name='auth-refresh'),
    path('auth/logout/', logout_view, name='auth-logout'),
    path('auth/me/', me_view, name='auth-me'),
    path('auth/change-password/', change_password_view, name='auth-change-password'),

    # ─── WhatsApp ─────────────────────────────────────────────────────────────
    path('whatsapp/webhook/', whatsapp_webhook, name='whatsapp-webhook'),
    path('whatsapp/send/', send_notification, name='whatsapp-send'),
    path('whatsapp/reminder/<int:cita_id>/', send_reminder, name='whatsapp-reminder'),

    # ─── Stripe ───────────────────────────────────────────────────────────────
    path('stripe/payment-intent/cita/', crear_payment_intent_cita, name='stripe-pi-cita'),
    path('stripe/payment-intent/orden/', crear_payment_intent_orden, name='stripe-pi-orden'),
    path('stripe/confirmar/', confirmar_pago, name='stripe-confirmar'),
    path('stripe/webhook/', stripe_webhook, name='stripe-webhook'),
]