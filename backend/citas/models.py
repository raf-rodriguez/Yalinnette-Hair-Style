from django.db import models
from django.utils import timezone


class Servicio(models.Model):
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    precio = models.DecimalField(max_digits=8, decimal_places=2)
    duracion_minutos = models.IntegerField(default=60)
    activo = models.BooleanField(default=True)
    imagen = models.CharField(max_length=255, blank=True, null=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Servicio'
        verbose_name_plural = 'Servicios'
        ordering = ['nombre']

    def __str__(self):
        return f"{self.nombre} - ${self.precio}"


class Producto(models.Model):
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    precio = models.DecimalField(max_digits=8, decimal_places=2)
    precio_costo = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    stock = models.IntegerField(default=0)
    # ← Sin choices fijos — acepta cualquier categoría personalizada
    categoria = models.CharField(max_length=50, default='general')
    imagen = models.CharField(max_length=255, blank=True, null=True)
    destacado = models.BooleanField(default=False)
    activo = models.BooleanField(default=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'
        ordering = ['nombre']

    def __str__(self):
        return f"{self.nombre} - ${self.precio}"


class Clienta(models.Model):
    nombre = models.CharField(max_length=100)
    telefono = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    notas = models.TextField(blank=True)
    total_visitas = models.IntegerField(default=0)
    total_gastado = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    creada = models.DateTimeField(auto_now_add=True)
    actualizada = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Clienta'
        verbose_name_plural = 'Clientas'
        ordering = ['-creada']

    def __str__(self):
        return f"{self.nombre} - {self.telefono}"


class Cita(models.Model):
    ESTADOS = [
        ('pendiente', 'Pendiente'),
        ('confirmada', 'Confirmada'),
        ('completada', 'Completada'),
        ('cancelada', 'Cancelada'),
        ('expirada', 'Expirada'),
    ]

    clienta = models.ForeignKey(Clienta, on_delete=models.SET_NULL, null=True, blank=True, related_name='citas')
    nombre = models.CharField(max_length=100)
    telefono = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    servicio = models.ForeignKey(Servicio, on_delete=models.CASCADE, related_name='citas')
    fecha_hora = models.DateTimeField()
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    pagado = models.BooleanField(default=False)
    monto_deposito = models.DecimalField(max_digits=8, decimal_places=2, default=5.00)
    monto_total = models.DecimalField(max_digits=8, decimal_places=2)
    codigo_qr = models.CharField(max_length=50, unique=True, blank=True)
    recordatorio_enviado = models.BooleanField(default=False)
    notas = models.TextField(blank=True)
    creada = models.DateTimeField(auto_now_add=True)
    actualizada = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Cita'
        verbose_name_plural = 'Citas'
        ordering = ['fecha_hora']

    def save(self, *args, **kwargs):
        if not self.codigo_qr:
            import uuid
            self.codigo_qr = str(uuid.uuid4())[:12].upper()
        if not self.monto_total:
            self.monto_total = self.servicio.precio
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.nombre} - {self.servicio.nombre} - {self.fecha_hora.strftime('%Y-%m-%d %H:%M')}"


class Bloqueo(models.Model):
    fecha = models.DateField()
    hora_inicio = models.TimeField(null=True, blank=True)
    hora_fin = models.TimeField(null=True, blank=True)
    todo_el_dia = models.BooleanField(default=False)
    motivo = models.CharField(max_length=200, blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Bloqueo'
        verbose_name_plural = 'Bloqueos'
        ordering = ['fecha']

    def __str__(self):
        if self.todo_el_dia:
            return f"Bloqueo: {self.fecha} (Todo el día)"
        return f"Bloqueo: {self.fecha} {self.hora_inicio}-{self.hora_fin}"


class Orden(models.Model):
    ESTADOS = [
        ('pendiente', 'Pendiente'),
        ('pagada', 'Pagada'),
        ('cancelada', 'Cancelada'),
    ]
    METODOS_PAGO = [
        ('athmovil', 'ATH Móvil'),
        ('paypal', 'PayPal'),
        ('stripe', 'Tarjeta de Crédito/Débito'),
    ]

    clienta = models.ForeignKey(Clienta, on_delete=models.SET_NULL, null=True, blank=True, related_name='ordenes')
    nombre_cliente = models.CharField(max_length=100)
    telefono_cliente = models.CharField(max_length=20)
    email_cliente = models.EmailField(blank=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    metodo_pago = models.CharField(max_length=20, choices=METODOS_PAGO, default='athmovil')
    referencia_pago = models.CharField(max_length=100, blank=True)
    notas = models.TextField(blank=True)
    creada = models.DateTimeField(auto_now_add=True)
    actualizada = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Orden'
        verbose_name_plural = 'Órdenes'
        ordering = ['-creada']

    def __str__(self):
        return f"Orden #{self.id} - {self.nombre_cliente} - ${self.total}"


class OrdenItem(models.Model):
    orden = models.ForeignKey(Orden, on_delete=models.CASCADE, related_name='items')
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    cantidad = models.IntegerField(default=1)
    precio_unit = models.DecimalField(max_digits=8, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        self.subtotal = self.precio_unit * self.cantidad
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.producto.nombre} x{self.cantidad}"


class Pago(models.Model):
    METODOS = [
        ('athmovil', 'ATH Móvil'),
        ('paypal', 'PayPal'),
        ('efectivo', 'Efectivo'),
        ('stripe', 'Tarjeta de Crédito/Débito'),
    ]
    ESTADOS = [
        ('pendiente', 'Pendiente'),
        ('completado', 'Completado'),
        ('fallido', 'Fallido'),
    ]

    cita = models.ForeignKey(Cita, on_delete=models.CASCADE, related_name='pagos', null=True, blank=True)
    orden = models.ForeignKey(Orden, on_delete=models.CASCADE, related_name='pagos', null=True, blank=True)
    monto = models.DecimalField(max_digits=8, decimal_places=2)
    metodo = models.CharField(max_length=20, choices=METODOS, default='athmovil')
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    referencia = models.CharField(max_length=100, blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Pago'
        verbose_name_plural = 'Pagos'

    def __str__(self):
        return f"Pago ${self.monto} - {self.metodo} - {self.estado}"