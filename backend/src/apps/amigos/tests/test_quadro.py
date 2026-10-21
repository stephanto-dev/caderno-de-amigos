"""Tests for the board column calculated from a friend's contact rhythm."""

from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import pytest
import time_machine
from django.utils import timezone

from apps.amigos.models import Amigo
from apps.amigos.services.quadro import Coluna, QuadroService


@pytest.fixture(autouse=True)
def congelar_relogio() -> Iterator[None]:
    """Keep each board test at Thursday 10:00 in São Paulo."""
    # time-machine only decorates unittest.TestCase classes, so pytest uses a fixture.
    with time_machine.travel(datetime(2026, 10, 22, 13, tzinfo=UTC), tick=False):
        yield


class TestQuadroService:
    def test_amigo_sem_contato_fica_em_faz_um_tempinho(self) -> None:
        # Arrange
        amigo = Amigo(ritmo_quantidade=1, ritmo_unidade=Amigo.RitmoUnidade.MES)

        # Act
        coluna = QuadroService().calcular_coluna(amigo, None)

        # Assert
        assert coluna == Coluna.FAZ_UM_TEMPINHO

    @pytest.mark.parametrize("dias_desde_contato", [0, 1])
    def test_contato_hoje_ou_ontem_fica_em_falei_agora(
        self, dias_desde_contato: int
    ) -> None:
        # Arrange
        amigo = Amigo(ritmo_quantidade=1, ritmo_unidade=Amigo.RitmoUnidade.DIA)
        ultimo_contato = timezone.now() - timedelta(days=dias_desde_contato)

        # Act
        coluna = QuadroService().calcular_coluna(amigo, ultimo_contato)

        # Assert
        assert coluna == Coluna.FALEI_AGORA

    @pytest.mark.parametrize("dias_desde_contato", [2, 22])
    def test_ritmo_mensal_com_mais_de_sete_dias_restantes_fica_em_dia(
        self, dias_desde_contato: int
    ) -> None:
        # Arrange
        amigo = Amigo(ritmo_quantidade=1, ritmo_unidade=Amigo.RitmoUnidade.MES)
        ultimo_contato = timezone.now() - timedelta(days=dias_desde_contato)

        # Act
        coluna = QuadroService().calcular_coluna(amigo, ultimo_contato)

        # Assert
        assert coluna == Coluna.EM_DIA

    def test_ritmo_mensal_com_sete_dias_restantes_fica_essa_semana(self) -> None:
        # Arrange
        amigo = Amigo(ritmo_quantidade=1, ritmo_unidade=Amigo.RitmoUnidade.MES)
        ultimo_contato = timezone.now() - timedelta(days=23)

        # Act
        coluna = QuadroService().calcular_coluna(amigo, ultimo_contato)

        # Assert
        assert coluna == Coluna.ESSA_SEMANA

    def test_ritmo_mensal_vencido_fica_em_faz_um_tempinho(self) -> None:
        # Arrange
        amigo = Amigo(ritmo_quantidade=1, ritmo_unidade=Amigo.RitmoUnidade.MES)
        ultimo_contato = timezone.now() - timedelta(days=30)

        # Act
        coluna = QuadroService().calcular_coluna(amigo, ultimo_contato)

        # Assert
        assert coluna == Coluna.FAZ_UM_TEMPINHO

    def test_ritmo_semanal_com_contato_ha_dois_dias_fica_essa_semana(self) -> None:
        # Arrange
        amigo = Amigo(ritmo_quantidade=1, ritmo_unidade=Amigo.RitmoUnidade.SEMANA)
        ultimo_contato = timezone.now() - timedelta(days=2)

        # Act
        coluna = QuadroService().calcular_coluna(amigo, ultimo_contato)

        # Assert
        assert coluna == Coluna.ESSA_SEMANA

    def test_duas_semanas_com_oito_dias_desde_contato_fica_essa_semana(self) -> None:
        # Arrange
        amigo = Amigo(ritmo_quantidade=2, ritmo_unidade=Amigo.RitmoUnidade.SEMANA)
        ultimo_contato = timezone.now() - timedelta(days=8)

        # Act
        coluna = QuadroService().calcular_coluna(amigo, ultimo_contato)

        # Assert
        assert coluna == Coluna.ESSA_SEMANA

    def test_ritmo_anual_com_358_dias_desde_contato_fica_essa_semana(self) -> None:
        # Arrange
        amigo = Amigo(ritmo_quantidade=1, ritmo_unidade=Amigo.RitmoUnidade.ANO)
        ultimo_contato = timezone.now() - timedelta(days=358)

        # Act
        coluna = QuadroService().calcular_coluna(amigo, ultimo_contato)

        # Assert
        assert coluna == Coluna.ESSA_SEMANA

    def test_contato_na_terca_a_noite_conta_como_terca_em_sao_paulo(self) -> None:
        # Arrange
        amigo = Amigo(ritmo_quantidade=1, ritmo_unidade=Amigo.RitmoUnidade.MES)
        ultimo_contato = datetime(2026, 10, 21, 2, 30, tzinfo=UTC)

        # Act
        coluna = QuadroService().calcular_coluna(amigo, ultimo_contato)

        # Assert
        assert coluna == Coluna.EM_DIA
