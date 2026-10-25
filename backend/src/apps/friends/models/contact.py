"""Contact history for friends."""

import uuid
from typing import ClassVar

from django.db import models
from django.utils import timezone


class Contact(models.Model):
    """A dated interaction with a friend; ownership comes from the friend."""

    class Kind(models.TextChoices):
        MESSAGE = "message", "Mensagem"
        CALL = "call", "Ligação"
        MEETING = "meeting", "Encontro"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    friend = models.ForeignKey(
        "friends.Friend",
        on_delete=models.CASCADE,
        related_name="contacts",
        verbose_name="Amigo",
        help_text="Amigo com quem ocorreu o contato.",
    )
    kind = models.CharField(
        max_length=8,
        choices=Kind.choices,
        verbose_name="Tipo",
        help_text="Forma de contato com o amigo.",
    )
    date = models.DateTimeField(
        default=timezone.now,
        verbose_name="Data",
        help_text="Data e hora em que o contato ocorreu.",
    )
    note = models.TextField(
        blank=True,
        verbose_name="Nota",
        help_text="Anotação opcional sobre o contato.",
    )

    class Meta:
        indexes = [models.Index(fields=["friend", "date"])]
        constraints: ClassVar[list[models.BaseConstraint]] = []
        verbose_name = "Contato"
        verbose_name_plural = "Contatos"

    def __str__(self) -> str:
        """Return the friend, contact type, and date shown in the admin."""
        return f"{self.friend} · {self.get_kind_display()} · {self.date:%d/%m/%Y}"
