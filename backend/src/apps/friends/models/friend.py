"""Friends and their desired contact rhythm."""

import uuid
from typing import ClassVar

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class Friend(models.Model):
    """A friend the owner wants to stay in touch with."""

    class CadenceUnit(models.TextChoices):
        DAY = "day", "Dia"
        WEEK = "week", "Semana"
        MONTH = "month", "Mês"
        YEAR = "year", "Ano"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="friends",
        verbose_name="Dono",
        help_text="Usuário dono deste amigo.",
    )
    cadence_unit = models.CharField(
        max_length=8,
        choices=CadenceUnit.choices,
        verbose_name="Unidade do ritmo",
        help_text="Unidade do intervalo desejado entre contatos.",
    )
    name = models.CharField(
        max_length=100,
        verbose_name="Nome",
        help_text="Nome do amigo.",
    )
    cadence_amount = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        verbose_name="Quantidade do ritmo",
        help_text="Intervalo entre contatos; mínimo de um.",
    )
    groups = models.ManyToManyField(
        "friends.Group",
        blank=True,
        related_name="friends",
        verbose_name="Grupos",
        help_text="Grupos aos quais este amigo pertence.",
    )

    class Meta:
        indexes: ClassVar[list[models.Index]] = []
        constraints: ClassVar[list[models.BaseConstraint]] = [
            models.CheckConstraint(
                condition=models.Q(cadence_amount__gte=1),
                name="friend_cadence_amount_gte_1",
            )
        ]
        verbose_name = "Amigo"
        verbose_name_plural = "Amigos"

    def __str__(self) -> str:
        """Return the name shown when selecting a friend in the admin."""
        return self.name
