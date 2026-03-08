"""
citas/auth_views.py
JWT Authentication — Login, Refresh, Logout, Me, Cambio de contraseña
"""
import logging
from django.contrib.auth import authenticate
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    POST /api/auth/login/
    Body: { "username": "admin", "password": "..." }
    Returns: { access, refresh, user }
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
        logger.warning(f"[Auth] Intento fallido: {username}")
        return Response(
            {'error': 'Usuario o contraseña incorrectos.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if not user.is_active:
        return Response(
            {'error': 'Cuenta desactivada. Contacta al administrador.'},
            status=status.HTTP_403_FORBIDDEN
        )

    refresh = RefreshToken.for_user(user)

    logger.info(f"[Auth] Login exitoso: {username}")

    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_staff': user.is_staff,
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
    Invalida el refresh token en la blacklist.
    """
    refresh_token = request.data.get('refresh')
    if refresh_token:
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            pass  # Token ya inválido, no es error

    return Response({'success': True, 'message': 'Sesión cerrada correctamente.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """
    GET /api/auth/me/
    Verifica el token y retorna info del usuario autenticado.
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
        return Response({'error': 'La contraseña debe tener mínimo 8 caracteres.'}, status=400)

    user = authenticate(username=request.user.username, password=current)
    if user is None:
        return Response({'error': 'Contraseña actual incorrecta.'}, status=401)

    user.set_password(new_pass)
    user.save()

    logger.info(f"[Auth] Contraseña cambiada: {request.user.username}")
    return Response({'success': True, 'message': 'Contraseña actualizada. Inicia sesión de nuevo.'})