"""Admin forms that apply the same phone format accepted by the friend API."""

from typing import cast

from django import forms
from django.core.exceptions import ValidationError

from apps.friends.models import Friend
from apps.friends.services.phone import PhoneService


class FriendAdminForm(forms.ModelForm):
    """Normalize phone input before model length and uniqueness validation."""

    phone = forms.CharField(
        label="Telefone",
        required=False,
        max_length=PhoneService.MAX_INPUT_LENGTH,
        help_text=(
            "Opcional. Informe DDD e número; para outro país, inclua + e o código."
        ),
    )

    class Meta:
        model = Friend
        fields = "__all__"

    def clean_phone(self) -> str | None:
        """Return the canonical phone or a recoverable field validation error."""
        try:
            return PhoneService().get_normalized_phone_for_friend(
                cast(str, self.cleaned_data["phone"])
            )
        except ValueError as error:
            raise ValidationError(str(error)) from error
