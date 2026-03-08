from rest_framework import serializers
from .models import Servicio, Producto, Clienta, Cita, Bloqueo, Orden, OrdenItem, Pago


class ServicioSerializer(serializers.ModelSerializer):
    imagen_url = serializers.SerializerMethodField()

    class Meta:
        model = Servicio
        fields = '__all__'

    def get_imagen_url(self, obj):
        if obj.imagen:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.imagen.url)
        return None


class ProductoSerializer(serializers.ModelSerializer):
    imagen_url = serializers.SerializerMethodField()

    class Meta:
        model = Producto
        fields = '__all__'

    def get_imagen_url(self, obj):
        if obj.imagen:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.imagen.url)
        return None


class ClientaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Clienta
        fields = '__all__'


class CitaSerializer(serializers.ModelSerializer):
    servicio_nombre = serializers.ReadOnlyField(source='servicio.nombre')
    servicio_precio = serializers.ReadOnlyField(source='servicio.precio')
    servicio_duracion = serializers.ReadOnlyField(source='servicio.duracion_minutos')

    class Meta:
        model = Cita
        fields = '__all__'


class BloqueoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bloqueo
        fields = '__all__'


class OrdenItemSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.ReadOnlyField(source='producto.nombre')

    class Meta:
        model = OrdenItem
        fields = '__all__'


class OrdenSerializer(serializers.ModelSerializer):
    items = OrdenItemSerializer(many=True, read_only=True)

    class Meta:
        model = Orden
        fields = '__all__'


class PagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pago
        fields = '__all__'
