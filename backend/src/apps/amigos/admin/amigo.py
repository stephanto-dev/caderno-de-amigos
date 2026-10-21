"""Django admin for friends."""

from django.contrib import admin

from apps.amigos.models import Amigo


@admin.register(Amigo)
class AmigoAdmin(admin.ModelAdmin):
    """Show friend ownership, contact rhythm, and groups in the admin."""

    list_display = ("nome", "owner", "ritmo_quantidade", "ritmo_unidade")
    search_fields = ("nome",)
    autocomplete_fields = ("owner", "grupos")
