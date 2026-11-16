"""Friends and their desired contact rhythm."""

import uuid
from typing import ClassVar

from django.conf import settings
from django.core.validators import MinValueValidator, RegexValidator
from django.db import models

_MONTHS_WITH_31_DAYS = (1, 3, 5, 7, 8, 10, 12)
_MONTHS_WITH_30_DAYS = (4, 6, 9, 11)
_FEBRUARY = 2
_FEBRUARY_MAX_BIRTHDAY_DAY = 29
FRIEND_PHONE_UNIQUE_CONSTRAINT = "friend_phone_unique_per_owner"
PHONE_MAX_LENGTH = 16
PHONE_E164_PATTERN = r"\A\+[1-9][0-9]{1,14}\Z"


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
    phone = models.CharField(
        max_length=PHONE_MAX_LENGTH,
        null=True,
        blank=True,
        validators=[
            RegexValidator(
                PHONE_E164_PATTERN,
                "Informe o telefone com código do país e DDD. Ex.: +5511999999999.",
            )
        ],
        verbose_name="Telefone",
        help_text="Opcional. Normalizado com código do país, único por dono.",
    )
    cadence_amount = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        verbose_name="Quantidade do ritmo",
        help_text="Intervalo entre contatos; mínimo de um.",
    )
    birthday_day = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        verbose_name="Dia do aniversário",
        help_text="Dia do aniversário; preencha também o mês ou deixe ambos vazios.",
    )
    birthday_month = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        verbose_name="Mês do aniversário",
        help_text="Mês do aniversário; preencha também o dia ou deixe ambos vazios.",
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
            models.UniqueConstraint(
                fields=("owner", "phone"),
                condition=models.Q(phone__isnull=False),
                name=FRIEND_PHONE_UNIQUE_CONSTRAINT,
            ),
            models.CheckConstraint(
                condition=models.Q(cadence_amount__gte=1),
                name="friend_cadence_amount_gte_1",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(birthday_day__isnull=True, birthday_month__isnull=True)
                    | models.Q(birthday_day__isnull=False, birthday_month__isnull=False)
                ),
                name="friend_birthday_fields_together",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(birthday_day__isnull=True, birthday_month__isnull=True)
                    | (
                        models.Q(birthday_day__gte=1)
                        & (
                            models.Q(
                                birthday_month__in=_MONTHS_WITH_31_DAYS,
                                birthday_day__lte=31,
                            )
                            | models.Q(
                                birthday_month__in=_MONTHS_WITH_30_DAYS,
                                birthday_day__lte=30,
                            )
                            | models.Q(
                                birthday_month=_FEBRUARY,
                                birthday_day__lte=_FEBRUARY_MAX_BIRTHDAY_DAY,
                            )
                        )
                    )
                ),
                name="friend_birthday_valid_date",
            ),
        ]
        verbose_name = "Amigo"
        verbose_name_plural = "Amigos"

    def __str__(self) -> str:
        """Return the name shown when selecting a friend in the admin."""
        return self.name
