"""Read-only representation of a friend on the board."""

from rest_framework import serializers

from apps.amigos.models import Grupo
from apps.amigos.services.quadro import Coluna


class GrupoDoAmigoSerializer(serializers.ModelSerializer[Grupo]):
    """Expose the group fields displayed with a friend."""

    class Meta:
        model = Grupo
        fields = ("id", "nome", "cor")


class AmigoDoQuadroSerializer(serializers.Serializer):
    """Expose a friend and the board fields computed by AmigosService."""

    id = serializers.IntegerField(source="amigo.id")
    nome = serializers.CharField(source="amigo.nome")
    ritmo_quantidade = serializers.IntegerField(source="amigo.ritmo_quantidade")
    ritmo_unidade = serializers.CharField(source="amigo.ritmo_unidade")
    coluna = serializers.ChoiceField(choices=Coluna.choices)
    ultimo_contato = serializers.DateTimeField(allow_null=True)
    ultima_nota = serializers.CharField(allow_null=True, allow_blank=True)
    grupos = GrupoDoAmigoSerializer(source="amigo.grupos", many=True)
