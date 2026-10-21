"""Django admin for friends."""

from django.contrib import admin

from apps.friends.models import Friend


@admin.register(Friend)
class FriendAdmin(admin.ModelAdmin):
    """Show friend ownership, contact rhythm, and groups in the admin."""

    list_display = ("name", "owner", "cadence_amount", "cadence_unit")
    search_fields = ("name",)
    autocomplete_fields = ("owner", "groups")
