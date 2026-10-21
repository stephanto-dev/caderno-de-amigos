"""Django admin for groups."""

from django.contrib import admin

from apps.amigos.models import Grupo


@admin.register(Grupo)
class GrupoAdmin(admin.ModelAdmin):
    """Show each group's name, color, and owner in the admin."""

    list_display = ("nome", "cor", "owner")
    search_fields = ("nome",)
    autocomplete_fields = ("owner",)
