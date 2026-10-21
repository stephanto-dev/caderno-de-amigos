"""Django admin for contacts."""

from django.contrib import admin

from apps.amigos.models import Contato


@admin.register(Contato)
class ContatoAdmin(admin.ModelAdmin):
    """Show each contact and the friend it belongs to in the admin."""

    list_display = ("amigo", "data", "tipo")
    autocomplete_fields = ("amigo",)
