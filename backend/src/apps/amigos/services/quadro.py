"""Calculate a friend's board column from their desired contact rhythm."""

from datetime import datetime
from typing import ClassVar

from django.db import models
from django.utils import timezone

from apps.amigos.models import Amigo


class Coluna(models.TextChoices):
    """Board column shown for a friend, calculated without storing it."""

    FALEI_AGORA = "falei_agora", "Falei agora"
    FAZ_UM_TEMPINHO = "faz_um_tempinho", "Faz um tempinho"
    ESSA_SEMANA = "essa_semana", "Essa semana"
    EM_DIA = "em_dia", "Em dia"


class QuadroService:
    """Select a board column using local calendar days and a fixed seven-day window."""

    DIAS_POR_UNIDADE: ClassVar[dict[str, int]] = {
        Amigo.RitmoUnidade.DIA: 1,
        Amigo.RitmoUnidade.SEMANA: 7,
        Amigo.RitmoUnidade.MES: 30,
        Amigo.RitmoUnidade.ANO: 365,
    }
    DIAS_FALEI_AGORA = 1
    DIAS_ESSA_SEMANA = 7

    def calcular_coluna(self, amigo: Amigo, ultimo_contato: datetime | None) -> Coluna:
        """Return the friend's column from the supplied last contact, without a query.

        Calendar dates use Django's active time zone, configured as São Paulo.
        A contact today or yesterday takes precedence over an expired rhythm.
        """
        if ultimo_contato is None:
            return Coluna.FAZ_UM_TEMPINHO

        dias_desde_ultimo_contato = (
            timezone.localdate() - timezone.localdate(ultimo_contato)
        ).days
        if dias_desde_ultimo_contato <= self.DIAS_FALEI_AGORA:
            return Coluna.FALEI_AGORA

        ritmo_em_dias = (
            amigo.ritmo_quantidade * self.DIAS_POR_UNIDADE[amigo.ritmo_unidade]
        )
        dias_ate_proximo_contato = ritmo_em_dias - dias_desde_ultimo_contato
        if dias_ate_proximo_contato <= 0:
            return Coluna.FAZ_UM_TEMPINHO
        if dias_ate_proximo_contato <= self.DIAS_ESSA_SEMANA:
            return Coluna.ESSA_SEMANA
        return Coluna.EM_DIA
