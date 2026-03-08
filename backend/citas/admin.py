from django.contrib import admin
from .models import Servicio, Producto, Clienta, Cita, Bloqueo, Orden, OrdenItem, Pago


@admin.register(Servicio)
class ServicioAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'precio', 'duracion_minutos', 'activo']
    list_filter = ['activo']
    search_fields = ['nombre']


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'precio', 'stock', 'categoria', 'destacado', 'activo']
    list_filter = ['categoria', 'destacado', 'activo']
    search_fields = ['nombre']


@admin.register(Clienta)
class ClientaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'telefono', 'email', 'total_visitas', 'total_gastado']
    search_fields = ['nombre', 'telefono', 'email']


@admin.register(Cita)
class CitaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'servicio', 'fecha_hora', 'estado', 'pagado']
    list_filter = ['estado', 'pagado']
    search_fields = ['nombre', 'telefono', 'codigo_qr']
    date_hierarchy = 'fecha_hora'


@admin.register(Bloqueo)
class BloqueoAdmin(admin.ModelAdmin):
    list_display = ['fecha', 'hora_inicio', 'hora_fin', 'todo_el_dia', 'motivo']


class OrdenItemInline(admin.TabularInline):
    model = OrdenItem
    extra = 0


@admin.register(Orden)
class OrdenAdmin(admin.ModelAdmin):
    list_display = ['id', 'nombre_cliente', 'total', 'estado', 'metodo_pago', 'creada']
    list_filter = ['estado', 'metodo_pago']
    search_fields = ['nombre_cliente', 'telefono_cliente']
    inlines = [OrdenItemInline]


@admin.register(Pago)
class PagoAdmin(admin.ModelAdmin):
    list_display = ['id', 'monto', 'metodo', 'estado', 'referencia', 'creado']
    list_filter = ['metodo', 'estado']
