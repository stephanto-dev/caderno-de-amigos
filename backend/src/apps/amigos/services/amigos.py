"""Read friends with the data needed by the board."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import TYPE_CHECKING, ClassVar, TypedDict

from django.contrib.auth.models import User
from django.db.models import Max, OuterRef, Prefetch, QuerySet, Subquery
from django.db.models.functions import Lower
from django.shortcuts import get_object_or_404
from django.utils import timezone

from apps.amigos.models import Amigo, Contato, Grupo
from apps.amigos.services.quadro import Coluna, QuadroService

if TYPE_CHECKING:
    from django_stubs_ext import WithAnnotations


class CamposCalculadosDoQuadro(TypedDict):
    """Fields added to each friend by the board query."""

    ultimo_contato: datetime | None
    ultima_nota: str | None


@dataclass(frozen=True)
class AmigoDoQuadro:
    """A friend and the computed fields shown in the board API."""

    amigo: Amigo
    coluna: Coluna
    ultimo_contato: datetime | None
    ultima_nota: str | None


class AmigosService:
    """Build board data from the view's owner-scoped friend queryset."""

    ORDEM_COLUNAS: ClassVar[dict[Coluna, int]] = {
        Coluna.FAZ_UM_TEMPINHO: 0,
        Coluna.ESSA_SEMANA: 1,
        Coluna.EM_DIA: 2,
        Coluna.FALEI_AGORA: 3,
    }

    def __init__(self, amigos_do_owner: QuerySet[Amigo], owner: User) -> None:
        self.amigos_do_owner = amigos_do_owner
        self.owner = owner

    def listar_amigos(self) -> list[AmigoDoQuadro]:
        """Return owner-scoped friends with board fields, sorted by urgency."""
        amigos = [
            self._build_amigo_do_quadro(amigo)
            for amigo in self._get_amigos_com_dados_do_quadro()
        ]
        return sorted(amigos, key=self._get_sort_key_for_amigo)

    def get_amigo_for_owner(self, amigo_id: int) -> AmigoDoQuadro:
        """Return one scoped friend or raise 404 if absent or owned by another user."""
        amigo = get_object_or_404(self._get_amigos_com_dados_do_quadro(), pk=amigo_id)
        return self._build_amigo_do_quadro(amigo)

    def _get_amigos_com_dados_do_quadro(
        self,
    ) -> QuerySet[WithAnnotations[Amigo, CamposCalculadosDoQuadro]]:
        contato_mais_recente = (
            Contato.objects.filter(amigo=OuterRef("pk"))
            .order_by("-data", "-id")
            .values("nota")[:1]
        )
        return self.amigos_do_owner.annotate(
            ultimo_contato=Max("contatos__data"),
            ultima_nota=Subquery(contato_mais_recente),
        ).prefetch_related(
            Prefetch(
                "grupos",
                # The model allows cross-owner links; the API must not expose them.
                queryset=Grupo.objects.filter(owner=self.owner).order_by(
                    Lower("nome"), "id"
                ),
            )
        )

    def _build_amigo_do_quadro(
        self, amigo: WithAnnotations[Amigo, CamposCalculadosDoQuadro]
    ) -> AmigoDoQuadro:
        ultimo_contato = amigo.ultimo_contato
        return AmigoDoQuadro(
            amigo=amigo,
            coluna=QuadroService().calcular_coluna(amigo, ultimo_contato),
            ultimo_contato=ultimo_contato,
            ultima_nota=amigo.ultima_nota,
        )

    def _get_sort_key_for_amigo(
        self, amigo_do_quadro: AmigoDoQuadro
    ) -> tuple[int, int, float, str]:
        amigo = amigo_do_quadro.amigo
        ultimo_contato = amigo_do_quadro.ultimo_contato
        ordem_coluna = self.ORDEM_COLUNAS[amigo_do_quadro.coluna]
        nome = amigo.nome.casefold()
        if ultimo_contato is None:
            return ordem_coluna, 0, 0, nome

        dias_desde_contato = (
            timezone.localdate() - timezone.localdate(ultimo_contato)
        ).days
        ritmo_em_dias = (
            amigo.ritmo_quantidade * QuadroService.DIAS_POR_UNIDADE[amigo.ritmo_unidade]
        )
        if amigo_do_quadro.coluna == Coluna.FAZ_UM_TEMPINHO:
            return ordem_coluna, 1, -dias_desde_contato / ritmo_em_dias, nome
        if amigo_do_quadro.coluna == Coluna.FALEI_AGORA:
            return ordem_coluna, 0, -ultimo_contato.timestamp(), nome
        return ordem_coluna, 0, ritmo_em_dias - dias_desde_contato, nome
