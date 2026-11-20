"""Input and output contracts for contact history."""

from rest_framework import serializers

from apps.friends.models import Contact


class ContactReadSerializer(serializers.ModelSerializer[Contact]):
    """Expose the same contact fields in history and recording responses."""

    class Meta:
        model = Contact
        fields = ("id", "kind", "date", "note")


class ContactWriteSerializer(serializers.Serializer):
    """Accept a contact type, an optional calendar date, and an optional note."""

    kind = serializers.ChoiceField(
        choices=Contact.Kind.choices,
        error_messages={
            "required": "Informe o tipo de contato: message, call ou meeting.",
            "invalid_choice": "Tipo de contato inválido. Use message, call ou meeting.",
        },
    )
    note = serializers.CharField(required=False, allow_blank=True)
    date = serializers.DateField(
        required=False,
        error_messages={
            "invalid": "Data inválida. Informe o dia do contato no formato AAAA-MM-DD.",
            "null": "Informe o dia do contato ou use a data de hoje.",
        },
    )


class ContactBatchWriteSerializer(ContactWriteSerializer):
    """Accept the same contact details with at least one selected friend."""

    friend_ids = serializers.ListField(
        child=serializers.UUIDField(
            error_messages={"invalid": "Amigo inválido. Escolha um amigo da lista."}
        ),
        allow_empty=False,
        error_messages={
            "required": "Escolha pelo menos um amigo para registrar o contato.",
            "empty": "Escolha pelo menos um amigo para registrar o contato.",
        },
    )
