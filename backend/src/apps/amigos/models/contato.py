"""Contact history for friends."""

from typing import ClassVar

from django.db import models
from django.utils import timezone


class Contato(models.Model):
    """A dated interaction with a friend; ownership comes from the friend."""

    class Tipo(models.TextChoices):
        MENSAGEM = "mensagem", "Mensagem"
        LIGACAO = "ligacao", "Ligação"
        ENCONTRO = "encontro", "Encontro"

    id = models.AutoField(primary_key=True)
    amigo = models.ForeignKey(
        "amigos.Amigo",
        on_delete=models.CASCADE,
        related_name="contatos",
        verbose_name="Amigo",
        help_text="Amigo com quem ocorreu o contato.",
    )
    tipo = models.CharField(
        max_length=8,
        choices=Tipo.choices,
        verbose_name="Tipo",
        help_text="Forma de contato com o amigo.",
    )
    data = models.DateTimeField(
        default=timezone.now,
        verbose_name="Data",
        help_text="Data e hora em que o contato ocorreu.",
    )
    nota = models.TextField(
        blank=True,
        verbose_name="Nota",
        help_text="Anotação opcional sobre o contato.",
    )

    class Meta:
        indexes = [models.Index(fields=["amigo", "data"])]
        constraints: ClassVar[list[models.BaseConstraint]] = []
        verbose_name = "Contato"
        verbose_name_plural = "Contatos"

    def __str__(self) -> str:
        """Return the friend, contact type, and date shown in the admin."""
        return f"{self.amigo} · {self.get_tipo_display()} · {self.data:%d/%m/%Y}"
