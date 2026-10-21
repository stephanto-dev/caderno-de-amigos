"""Groups used to organize friends."""

from typing import ClassVar

from django.conf import settings
from django.db import models


class Group(models.Model):
    """A named group belonging to one user."""

    class Color(models.TextChoices):
        FAMILY = "family", "Família"
        COLLEGE = "college", "Faculdade"
        WORK = "work", "Trabalho"
        NEIGHBORHOOD = "neighborhood", "Vizinhança"
        NEUTRAL = "neutral", "Neutro"

    id = models.AutoField(primary_key=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="friend_groups",
        verbose_name="Dono",
        help_text="Usuário dono deste grupo.",
    )
    color = models.CharField(
        max_length=16,
        choices=Color.choices,
        verbose_name="Cor",
        help_text="Cor usada para identificar o grupo no quadro.",
    )
    name = models.CharField(
        max_length=100,
        verbose_name="Nome",
        help_text="Nome do grupo para este usuário.",
    )

    class Meta:
        indexes: ClassVar[list[models.Index]] = []
        constraints: ClassVar[list[models.BaseConstraint]] = [
            models.UniqueConstraint(
                fields=["owner", "name"], name="group_owner_name_unique"
            )
        ]
        verbose_name = "Grupo"
        verbose_name_plural = "Grupos"

    def __str__(self) -> str:
        """Return the name shown when selecting a group in the admin."""
        return self.name
