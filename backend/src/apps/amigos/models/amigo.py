"""Friends and their desired contact rhythm."""

from typing import ClassVar

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class Amigo(models.Model):
    """A friend the owner wants to stay in touch with."""

    class RitmoUnidade(models.TextChoices):
        DIA = "dia", "Dia"
        SEMANA = "semana", "Semana"
        MES = "mes", "Mês"
        ANO = "ano", "Ano"

    id = models.AutoField(primary_key=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="amigos",
        verbose_name="Dono",
        help_text="Usuário dono deste amigo.",
    )
    ritmo_unidade = models.CharField(
        max_length=8,
        choices=RitmoUnidade.choices,
        verbose_name="Unidade do ritmo",
        help_text="Unidade do intervalo desejado entre contatos.",
    )
    nome = models.CharField(
        max_length=100,
        verbose_name="Nome",
        help_text="Nome do amigo.",
    )
    ritmo_quantidade = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        verbose_name="Quantidade do ritmo",
        help_text="Intervalo entre contatos; mínimo de um.",
    )
    grupos = models.ManyToManyField(
        "amigos.Grupo",
        blank=True,
        related_name="amigos",
        verbose_name="Grupos",
        help_text="Grupos aos quais este amigo pertence.",
    )

    class Meta:
        indexes: ClassVar[list[models.Index]] = []
        constraints: ClassVar[list[models.BaseConstraint]] = []
        verbose_name = "Amigo"
        verbose_name_plural = "Amigos"

    def __str__(self) -> str:
        """Return the name shown when selecting a friend in the admin."""
        return self.nome
