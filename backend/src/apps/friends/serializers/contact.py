"""Input contract for recording a contact."""

from rest_framework import serializers

from apps.friends.models import Contact


class ContactWriteSerializer(serializers.Serializer):
    """Accept a contact type and optional note, leaving the date to the server."""

    kind = serializers.ChoiceField(
        choices=Contact.Kind.choices,
        error_messages={
            "required": "Informe o tipo de contato: message, call ou meeting.",
            "invalid_choice": "Tipo de contato inválido. Use message, call ou meeting.",
        },
    )
    note = serializers.CharField(required=False, allow_blank=True)
