"""
Beauty Salon WhatsApp Bot
Maneja conversaciones automatizadas para reservas de citas via WhatsApp
"""
from django.conf import settings
from django.utils import timezone
from datetime import datetime, timedelta, date
from .models import Servicio, Cita, Clienta, Bloqueo
import re


def get_twilio_client():
    from twilio.rest import Client
    return Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)


def send_whatsapp(to_number: str, message: str):
    """Envía mensaje de WhatsApp via Twilio."""
    try:
        client = get_twilio_client()
        # Asegurar formato correcto
        if not to_number.startswith('whatsapp:'):
            to_number = f'whatsapp:{to_number}'
        client.messages.create(
            from_=settings.TWILIO_WHATSAPP_FROM,
            body=message,
            to=to_number
        )
    except Exception as e:
        print(f"[WhatsApp Error] {e}")


# ─── Sesiones en memoria (en producción usar Redis o DB) ──────────────────────
# Formato: { telefono: { step, data } }
_sessions: dict = {}

def get_session(phone: str) -> dict:
    return _sessions.get(phone, {})

def set_session(phone: str, data: dict):
    _sessions[phone] = data

def clear_session(phone: str):
    _sessions.pop(phone, None)


# ─── Mensajes del bot ─────────────────────────────────────────────────────────

BIENVENIDA = """✨ *¡Hola! Bienvenida a Beauty Salon* ✨
📍 Caguas, Puerto Rico
🕐 Martes a Sábado: 9AM – 6PM

¿Qué deseas hacer?

1️⃣ Agendar una cita
2️⃣ Ver mis citas
3️⃣ Cancelar una cita
4️⃣ Ver servicios y precios

Responde con el número de tu opción 😊"""


def menu_servicios() -> str:
    servicios = Servicio.objects.filter(activo=True)
    lines = ["💅 *Nuestros Servicios*\n"]
    for i, s in enumerate(servicios, 1):
        lines.append(f"{i}️⃣ {s.nombre} — *${s.precio}* ({s.duracion_minutos} min)")
    lines.append("\nResponde con el *número* del servicio que deseas reservar.")
    lines.append("\nEscribe *0* para volver al menú principal.")
    return "\n".join(lines)


def menu_fechas() -> str:
    hoy = date.today()
    fechas = []
    i = 1
    dias_mostrados = 0
    offset = 1
    while dias_mostrados < 7:
        d = hoy + timedelta(days=offset)
        offset += 1
        if d.weekday() not in (0, 6):  # Skip Mon y Sun
            fechas.append((i, d))
            i += 1
            dias_mostrados += 1

    lines = ["📅 *Selecciona una fecha:*\n"]
    for num, d in fechas:
        nombre_dia = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"][d.weekday()]
        lines.append(f"{num}️⃣ {nombre_dia} {d.strftime('%d/%m')}")
    lines.append("\nResponde con el *número* de la fecha.")
    lines.append("Escribe *0* para volver al menú.")
    return "\n".join(lines), fechas


def menu_horarios(fecha: date, servicio_id: int) -> tuple:
    """Retorna mensaje con horarios disponibles y lista de slots."""
    try:
        servicio = Servicio.objects.get(id=servicio_id)
    except Servicio.DoesNotExist:
        return "❌ Servicio no encontrado.", []

    # Verificar bloqueo total del día
    if Bloqueo.objects.filter(fecha=fecha, todo_el_dia=True).exists():
        return "❌ Este día no está disponible. Por favor elige otra fecha.", []

    duracion = servicio.duracion_minutos
    bloqueos = Bloqueo.objects.filter(fecha=fecha, todo_el_dia=False)
    citas_dia = Cita.objects.filter(
        fecha_hora__date=fecha,
        estado__in=['pendiente', 'confirmada']
    )

    slots_disponibles = []
    current = datetime.combine(fecha, datetime.min.time()).replace(hour=9)
    end = datetime.combine(fecha, datetime.min.time()).replace(hour=18)

    while current + timedelta(minutes=duracion) <= end:
        hora = current.time()
        hora_fin = (current + timedelta(minutes=duracion)).time()

        bloqueado = any(
            b.hora_inicio and b.hora_fin and
            not (hora_fin <= b.hora_inicio or hora >= b.hora_fin)
            for b in bloqueos
        )
        ocupado = any(
            not (hora_fin <= c.fecha_hora.time() or
                 hora >= (c.fecha_hora + timedelta(minutes=c.servicio.duracion_minutos)).time())
            for c in citas_dia
        )

        if not bloqueado and not ocupado:
            slots_disponibles.append(current.strftime('%H:%M'))
        current += timedelta(minutes=30)

    if not slots_disponibles:
        return "😔 No hay horarios disponibles para esta fecha. Por favor elige otro día.", []

    lines = [f"⏰ *Horarios disponibles:*\n"]
    for i, slot in enumerate(slots_disponibles, 1):
        # Convertir a 12h
        h, m = map(int, slot.split(':'))
        ampm = 'AM' if h < 12 else 'PM'
        h12 = h if h <= 12 else h - 12
        if h12 == 0: h12 = 12
        lines.append(f"{i}️⃣ {h12}:{m:02d} {ampm}")

    lines.append("\nResponde con el *número* del horario.")
    lines.append("Escribe *0* para elegir otra fecha.")
    return "\n".join(lines), slots_disponibles


# ─── Procesador principal de mensajes ────────────────────────────────────────

def process_message(phone: str, message: str) -> str:
    """
    Procesa un mensaje entrante y retorna la respuesta.
    phone: número con formato whatsapp:+1XXXXXXXXXX
    message: texto recibido
    """
    msg = message.strip().lower()
    session = get_session(phone)
    step = session.get('step', 'inicio')

    # ── Comandos globales ──
    if msg in ('hola', 'hi', 'hello', 'menu', 'menú', 'inicio', 'start', '0') and step not in ('pedir_nombre', 'pedir_fecha', 'pedir_hora'):
        clear_session(phone)
        return BIENVENIDA

    # ── Sin sesión activa → mostrar bienvenida ──
    if step == 'inicio' or not session:
        if msg == '1':
            set_session(phone, {'step': 'elegir_servicio'})
            return menu_servicios()
        elif msg == '2':
            return ver_mis_citas(phone)
        elif msg == '3':
            return iniciar_cancelacion(phone)
        elif msg == '4':
            return menu_servicios_info()
        else:
            return BIENVENIDA

    # ── Flujo de agendamiento ──
    elif step == 'elegir_servicio':
        if msg == '0':
            clear_session(phone)
            return BIENVENIDA

        servicios = list(Servicio.objects.filter(activo=True))
        try:
            idx = int(msg) - 1
            if 0 <= idx < len(servicios):
                servicio = servicios[idx]
                set_session(phone, {
                    'step': 'elegir_fecha',
                    'servicio_id': servicio.id,
                    'servicio_nombre': servicio.nombre,
                    'servicio_precio': str(servicio.precio),
                })
                respuesta, fechas = menu_fechas()
                # Guardar fechas en sesión
                session_data = get_session(phone)
                session_data['fechas_disponibles'] = [f.isoformat() for _, f in fechas]
                set_session(phone, session_data)
                return f"✅ Seleccionaste: *{servicio.nombre}* (${servicio.precio})\n\n{respuesta}"
            else:
                return f"❌ Opción inválida. Elige un número del 1 al {len(servicios)}."
        except ValueError:
            return "❌ Por favor responde con un número."

    elif step == 'elegir_fecha':
        if msg == '0':
            set_session(phone, {'step': 'elegir_servicio'})
            return menu_servicios()

        fechas_str = session.get('fechas_disponibles', [])
        try:
            idx = int(msg) - 1
            if 0 <= idx < len(fechas_str):
                fecha_sel = date.fromisoformat(fechas_str[idx])
                session_data = get_session(phone)
                session_data['step'] = 'elegir_hora'
                session_data['fecha'] = fecha_sel.isoformat()
                set_session(phone, session_data)

                respuesta, slots = menu_horarios(fecha_sel, session_data['servicio_id'])
                session_data['slots_disponibles'] = slots
                set_session(phone, session_data)
                return respuesta
            else:
                return f"❌ Opción inválida. Elige un número del 1 al {len(fechas_str)}."
        except ValueError:
            return "❌ Por favor responde con un número."

    elif step == 'elegir_hora':
        if msg == '0':
            session_data = get_session(phone)
            session_data['step'] = 'elegir_fecha'
            set_session(phone, session_data)
            respuesta, fechas = menu_fechas()
            session_data['fechas_disponibles'] = [f.isoformat() for _, f in fechas]
            set_session(phone, session_data)
            return respuesta

        slots = session.get('slots_disponibles', [])
        try:
            idx = int(msg) - 1
            if 0 <= idx < len(slots):
                hora_sel = slots[idx]
                session_data = get_session(phone)
                session_data['step'] = 'pedir_nombre'
                session_data['hora'] = hora_sel
                set_session(phone, session_data)

                fecha = date.fromisoformat(session_data['fecha'])
                nombre_dia = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"][fecha.weekday()]
                h, m = map(int, hora_sel.split(':'))
                ampm = 'AM' if h < 12 else 'PM'
                h12 = h if h <= 12 else h - 12
                if h12 == 0: h12 = 12

                return (
                    f"📋 *Resumen de tu cita:*\n\n"
                    f"💅 Servicio: {session_data['servicio_nombre']}\n"
                    f"📅 Fecha: {nombre_dia} {fecha.strftime('%d/%m/%Y')}\n"
                    f"⏰ Hora: {h12}:{m:02d} {ampm}\n"
                    f"💵 Total: ${session_data['servicio_precio']}\n\n"
                    f"Para confirmar, escribe tu *nombre completo*:"
                )
            else:
                return f"❌ Opción inválida. Elige un número del 1 al {len(slots)}."
        except ValueError:
            return "❌ Por favor responde con un número."

    elif step == 'pedir_nombre':
        if len(message.strip()) < 3:
            return "❌ Por favor escribe tu nombre completo."
        session_data = get_session(phone)
        session_data['step'] = 'confirmar'
        session_data['nombre'] = message.strip().title()
        set_session(phone, session_data)

        return (
            f"Hola *{session_data['nombre']}* 👋\n\n"
            f"¿Confirmas tu cita?\n\n"
            f"💅 {session_data['servicio_nombre']}\n"
            f"📅 {session_data['fecha']}\n"
            f"⏰ {session_data['hora']}\n"
            f"💵 ${session_data['servicio_precio']}\n\n"
            f"Responde:\n"
            f"✅ *SI* para confirmar\n"
            f"❌ *NO* para cancelar"
        )

    elif step == 'confirmar':
        if msg in ('si', 'sí', 's', 'yes', 'confirmar', '1'):
            return crear_cita_whatsapp(phone, session)
        elif msg in ('no', 'n', 'cancelar', '0', '2'):
            clear_session(phone)
            return "❌ Cita cancelada.\n\n" + BIENVENIDA
        else:
            return "Por favor responde *SI* para confirmar o *NO* para cancelar."

    elif step == 'cancelar_cita':
        return procesar_cancelacion(phone, msg, session)

    else:
        clear_session(phone)
        return BIENVENIDA


def crear_cita_whatsapp(phone: str, session: dict) -> str:
    """Crea la cita en la base de datos."""
    try:
        servicio = Servicio.objects.get(id=session['servicio_id'])
        fecha = date.fromisoformat(session['fecha'])
        hora_str = session['hora']
        hora = datetime.strptime(hora_str, '%H:%M').time()
        fecha_hora = datetime.combine(fecha, hora)

        # Limpiar número de teléfono
        phone_clean = phone.replace('whatsapp:', '').replace('+', '').replace('-', '').replace(' ', '')
        if phone_clean.startswith('1'):
            phone_display = f"{phone_clean[1:4]}-{phone_clean[4:7]}-{phone_clean[7:]}"
        else:
            phone_display = phone_clean

        # Crear o encontrar clienta
        clienta, _ = Clienta.objects.get_or_create(
            telefono=phone_display,
            defaults={'nombre': session['nombre']}
        )
        if clienta.nombre != session['nombre']:
            clienta.nombre = session['nombre']
            clienta.save()

        # Crear cita
        cita = Cita.objects.create(
            clienta=clienta,
            nombre=session['nombre'],
            telefono=phone_display,
            servicio=servicio,
            fecha_hora=fecha_hora,
            monto_deposito=5.00,
            monto_total=servicio.precio,
            estado='pendiente',
            notas='Reservada via WhatsApp'
        )

        clear_session(phone)

        nombre_dia = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"][fecha.weekday()]
        h, m = map(int, hora_str.split(':'))
        ampm = 'AM' if h < 12 else 'PM'
        h12 = h if h <= 12 else h - 12
        if h12 == 0: h12 = 12

        return (
            f"🎉 *¡Cita reservada exitosamente!*\n\n"
            f"🔑 Código: *{cita.codigo_qr}*\n"
            f"💅 {servicio.nombre}\n"
            f"📅 {nombre_dia} {fecha.strftime('%d/%m/%Y')}\n"
            f"⏰ {h12}:{m:02d} {ampm}\n"
            f"📍 Caguas, Puerto Rico\n\n"
            f"💳 *Depósito de $5.00 requerido*\n"
            f"Envía por ATH Móvil al *787-718-7189*\n"
            f"o PayPal: paypal.me/BeautySalonPR/5\n"
            f"_(Escribe tu código {cita.codigo_qr} en el memo)_\n\n"
            f"¡Te esperamos! ✨\n"
            f"📞 787-718-7189"
        )
    except Exception as e:
        clear_session(phone)
        return f"❌ Hubo un error al crear tu cita. Por favor llámanos al 787-718-7189.\nError: {str(e)}"


def ver_mis_citas(phone: str) -> str:
    """Muestra las citas activas de la clienta."""
    phone_clean = phone.replace('whatsapp:', '').replace('+1', '').replace('+', '')
    phone_clean = phone_clean.replace('-', '').replace(' ', '')
    if len(phone_clean) == 10:
        phone_display = f"{phone_clean[:3]}-{phone_clean[3:6]}-{phone_clean[6:]}"
    else:
        phone_display = phone_clean

    citas = Cita.objects.filter(
        telefono__contains=phone_clean[-7:],
        estado__in=['pendiente', 'confirmada'],
        fecha_hora__gte=timezone.now()
    ).order_by('fecha_hora')[:5]

    if not citas:
        return "📋 No tienes citas próximas.\n\nEscribe *1* para agendar una nueva cita."

    lines = ["📋 *Tus próximas citas:*\n"]
    for c in citas:
        fecha = c.fecha_hora
        nombre_dia = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"][fecha.weekday()]
        h = fecha.hour
        ampm = 'AM' if h < 12 else 'PM'
        h12 = h if h <= 12 else h - 12
        estado_emoji = "⏳" if c.estado == 'pendiente' else "✅"
        lines.append(
            f"{estado_emoji} *{c.servicio.nombre}*\n"
            f"   📅 {nombre_dia} {fecha.strftime('%d/%m/%Y')} {h12}:{fecha.minute:02d} {ampm}\n"
            f"   🔑 Código: {c.codigo_qr}\n"
        )

    lines.append("Escribe *3* para cancelar una cita.")
    return "\n".join(lines)


def iniciar_cancelacion(phone: str) -> str:
    set_session(phone, {'step': 'cancelar_cita'})
    return (
        "❌ *Cancelar Cita*\n\n"
        "Escribe el *código* de tu cita para cancelarla.\n"
        "(Lo encuentras en el mensaje de confirmación)\n\n"
        "Escribe *0* para volver al menú."
    )


def procesar_cancelacion(phone: str, msg: str, session: dict) -> str:
    if msg == '0':
        clear_session(phone)
        return BIENVENIDA

    codigo = msg.upper().strip()
    try:
        cita = Cita.objects.get(codigo_qr=codigo, estado__in=['pendiente', 'confirmada'])
        cita.estado = 'cancelada'
        cita.save()
        clear_session(phone)
        return (
            f"✅ Tu cita ha sido cancelada.\n\n"
            f"💅 {cita.servicio.nombre}\n"
            f"📅 {cita.fecha_hora.strftime('%d/%m/%Y %H:%M')}\n\n"
            f"Para agendar una nueva cita escribe *1*."
        )
    except Cita.DoesNotExist:
        return (
            f"❌ No encontré una cita con el código *{codigo}*.\n"
            f"Verifica el código e intenta de nuevo.\n\n"
            f"Escribe *0* para volver al menú."
        )


def menu_servicios_info() -> str:
    """Lista de servicios solo informativa (sin flujo de reserva)."""
    servicios = Servicio.objects.filter(activo=True)
    lines = ["💅 *Servicios y Precios*\n"]
    for s in servicios:
        lines.append(f"• {s.nombre}: *${s.precio}* ({s.duracion_minutos} min)")
    lines.append(f"\n📍 Caguas, Puerto Rico")
    lines.append(f"🕐 Mar–Sáb: 9AM–6PM")
    lines.append(f"\nEscribe *1* para agendar tu cita 😊")
    return "\n".join(lines)
