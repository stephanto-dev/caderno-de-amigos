"""Django admin for contacts."""

from django.contrib import admin

from apps.friends.models import Contact


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    """Show each contact and the friend it belongs to in the admin."""

    list_display = ("friend", "date", "kind")
    autocomplete_fields = ("friend",)
