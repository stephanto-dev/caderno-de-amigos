"""Django admin for groups."""

from django.contrib import admin

from apps.friends.models import Group


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    """Show each group's name, color, and owner in the admin."""

    list_display = ("name", "color", "owner")
    search_fields = ("name",)
    autocomplete_fields = ("owner",)
