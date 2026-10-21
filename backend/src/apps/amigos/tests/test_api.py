"""API contract for reading friends on the board."""

from collections.abc import Callable, Iterator
from contextlib import AbstractContextManager
from datetime import UTC, datetime, timedelta

import pytest
import time_machine
from django.contrib.auth.models import User
from django.core.cache import cache
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.amigos.models import Amigo, Contato, Grupo


@pytest.fixture(autouse=True)
def congelar_relogio() -> Iterator[None]:
    """Keep board ordering tests on a fixed São Paulo calendar day."""
    with time_machine.travel(datetime(2026, 10, 22, 13, tzinfo=UTC), tick=False):
        yield


@pytest.fixture(autouse=True)
def clear_amigos_throttle_cache() -> None:
    """Keep rate limit counters from one API test out of the next."""
    cache.clear()


def create_amigo_for_owner(
    owner: User,
    nome: str,
    ritmo_em_dias: int = 30,
    dias_desde_contato: int | None = None,
) -> Amigo:
    """Create a friend and optionally one contact for an API scenario."""
    amigo = Amigo.objects.create(
        owner=owner,
        nome=nome,
        ritmo_quantidade=ritmo_em_dias,
        ritmo_unidade=Amigo.RitmoUnidade.DIA,
    )
    if dias_desde_contato is not None:
        Contato.objects.create(
            amigo=amigo,
            tipo=Contato.Tipo.MENSAGEM,
            data=timezone.now() - timedelta(days=dias_desde_contato),
        )
    return amigo


@pytest.mark.django_db
class TestAmigosReadAPI:
    def test_lista_sem_login_retorna_403(self) -> None:
        # Arrange
        url = reverse("listar_amigos")

        # Act
        response = APIClient().get(url)

        # Assert
        assert response.status_code == 403

    def test_detalhe_sem_login_retorna_403(self) -> None:
        # Arrange
        url = reverse("get_amigo", args=[1])

        # Act
        response = APIClient().get(url)

        # Assert
        assert response.status_code == 403

    def test_lista_mostra_apenas_amigos_do_usuario(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        other_owner = User.objects.create_user(username="bia")
        amigo = create_amigo_for_owner(owner, "Ana")
        create_amigo_for_owner(other_owner, "Bia")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.get(reverse("listar_amigos"))

        # Assert
        assert response.status_code == 200
        assert [amigo_data["id"] for amigo_data in response.data] == [amigo.id]

    def test_detalhe_de_outro_dono_retorna_404(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        other_owner = User.objects.create_user(username="bia")
        amigo = create_amigo_for_owner(other_owner, "Bia")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.get(reverse("get_amigo", args=[amigo.id]))

        # Assert
        assert response.status_code == 404

    def test_detalhe_retorna_ultimo_contato_ultima_nota_e_grupos_ordenados(
        self,
    ) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        amigo = create_amigo_for_owner(owner, "Ana")
        Contato.objects.create(
            amigo=amigo,
            tipo=Contato.Tipo.MENSAGEM,
            data=timezone.now() - timedelta(days=4),
            nota="Nota antiga",
        )
        contato_recente = Contato.objects.create(
            amigo=amigo,
            tipo=Contato.Tipo.LIGACAO,
            data=timezone.now() - timedelta(days=2),
            nota="Nota recente",
        )
        grupo_z = Grupo.objects.create(owner=owner, nome="Zoeira", cor=Grupo.Cor.NEUTRO)
        grupo_a = Grupo.objects.create(
            owner=owner, nome="amigos", cor=Grupo.Cor.FAMILIA
        )
        amigo.grupos.add(grupo_z, grupo_a)
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.get(reverse("get_amigo", args=[amigo.id]))

        # Assert
        assert response.status_code == 200
        assert response.data == {
            "id": amigo.id,
            "nome": "Ana",
            "ritmo_quantidade": 30,
            "ritmo_unidade": Amigo.RitmoUnidade.DIA,
            "coluna": "em_dia",
            "ultimo_contato": timezone.localtime(contato_recente.data).isoformat(),
            "ultima_nota": "Nota recente",
            "grupos": [
                {"id": grupo_a.id, "nome": "amigos", "cor": Grupo.Cor.FAMILIA},
                {"id": grupo_z.id, "nome": "Zoeira", "cor": Grupo.Cor.NEUTRO},
            ],
        }

    def test_amigo_sem_contato_fica_em_faz_um_tempinho(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        amigo = create_amigo_for_owner(owner, "Ana")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.get(reverse("listar_amigos"))

        # Assert
        assert response.data[0]["id"] == amigo.id
        assert response.data[0]["coluna"] == "faz_um_tempinho"
        assert response.data[0]["ultimo_contato"] is None
        assert response.data[0]["ultima_nota"] is None

    def test_grupo_de_outro_dono_nao_aparece_na_resposta(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        other_owner = User.objects.create_user(username="bia")
        amigo = create_amigo_for_owner(owner, "Ana")
        grupo_de_outro_dono = Grupo.objects.create(
            owner=other_owner, nome="Privado", cor=Grupo.Cor.NEUTRO
        )
        amigo.grupos.add(grupo_de_outro_dono)
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.get(reverse("get_amigo", args=[amigo.id]))

        # Assert
        assert response.status_code == 200
        assert response.data["grupos"] == []

    def test_lista_ordena_colunas_e_amigos_por_urgencia(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        # Criação fora da ordem esperada para detectar ordenação acidental por ID.
        create_amigo_for_owner(owner, "Falei ontem", dias_desde_contato=1)
        create_amigo_for_owner(owner, "Em dia longe", dias_desde_contato=2)
        create_amigo_for_owner(owner, "Essa semana longe", dias_desde_contato=24)
        create_amigo_for_owner(owner, "Atraso menor", dias_desde_contato=35)
        create_amigo_for_owner(owner, "Falei hoje", dias_desde_contato=0)
        create_amigo_for_owner(owner, "Em dia perto", dias_desde_contato=20)
        create_amigo_for_owner(owner, "Essa semana perto", dias_desde_contato=28)
        create_amigo_for_owner(owner, "Atraso maior", dias_desde_contato=60)
        create_amigo_for_owner(owner, "Nunca")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.get(reverse("listar_amigos"))

        # Assert
        assert [amigo_data["nome"] for amigo_data in response.data] == [
            "Nunca",
            "Atraso maior",
            "Atraso menor",
            "Essa semana perto",
            "Essa semana longe",
            "Em dia perto",
            "Em dia longe",
            "Falei hoje",
            "Falei ontem",
        ]

    def test_atrasados_usam_proporcao_de_dias_e_ritmo_para_ordenar(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        create_amigo_for_owner(
            owner, "Mais dias absolutos", ritmo_em_dias=30, dias_desde_contato=40
        )
        create_amigo_for_owner(
            owner, "Mais atrasado no ritmo", ritmo_em_dias=10, dias_desde_contato=20
        )
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.get(reverse("listar_amigos"))

        # Assert
        assert [amigo_data["nome"] for amigo_data in response.data] == [
            "Mais atrasado no ritmo",
            "Mais dias absolutos",
        ]

    def test_empate_na_urgencia_usa_nome_para_ordenar(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        create_amigo_for_owner(owner, "Bia", dias_desde_contato=25)
        create_amigo_for_owner(owner, "Ana", dias_desde_contato=25)
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.get(reverse("listar_amigos"))

        # Assert
        assert [amigo_data["nome"] for amigo_data in response.data] == ["Ana", "Bia"]

    def test_gets_de_amigos_sao_limitados_por_usuario(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        responses = [client.get(reverse("listar_amigos")) for _ in range(61)]

        # Assert
        assert all(response.status_code == 200 for response in responses[:60])
        assert responses[60].status_code == 429

    def test_lista_nao_adiciona_queries_por_amigo(
        self, django_assert_num_queries: Callable[[int], AbstractContextManager[None]]
    ) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        grupo = Grupo.objects.create(owner=owner, nome="Grupo", cor=Grupo.Cor.NEUTRO)
        primeiro = create_amigo_for_owner(owner, "Amigo 1", dias_desde_contato=2)
        primeiro.grupos.add(grupo)
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        with CaptureQueriesContext(connection) as queries_com_um_amigo:
            response = client.get(reverse("listar_amigos"))
            assert response.status_code == 200

        for indice in range(2, 6):
            amigo = create_amigo_for_owner(
                owner, f"Amigo {indice}", dias_desde_contato=indice
            )
            amigo.grupos.add(grupo)

        with django_assert_num_queries(len(queries_com_um_amigo)):
            response = client.get(reverse("listar_amigos"))

        # Assert
        assert response.status_code == 200
        assert len(response.data) == 5
