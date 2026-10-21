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

from apps.friends.models import Contact, Friend, Group


@pytest.fixture(autouse=True)
def freeze_clock() -> Iterator[None]:
    """Keep board ordering tests on a fixed São Paulo calendar day."""
    with time_machine.travel(datetime(2026, 10, 22, 13, tzinfo=UTC), tick=False):
        yield


@pytest.fixture(autouse=True)
def clear_friends_throttle_cache() -> None:
    """Keep rate limit counters from one API test out of the next."""
    cache.clear()


def create_friend_for_owner(
    owner: User,
    name: str,
    cadence_in_days: int = 30,
    days_since_contact: int | None = None,
) -> Friend:
    """Create a friend and optionally one contact for an API scenario."""
    friend = Friend.objects.create(
        owner=owner,
        name=name,
        cadence_amount=cadence_in_days,
        cadence_unit=Friend.CadenceUnit.DAY,
    )
    if days_since_contact is not None:
        Contact.objects.create(
            friend=friend,
            kind=Contact.Kind.MESSAGE,
            date=timezone.now() - timedelta(days=days_since_contact),
        )
    return friend


@pytest.mark.django_db
class TestFriendsReadAPI:
    def test_list_without_login_returns_403(self) -> None:
        # Arrange
        url = reverse("list_friends")

        # Act
        response = APIClient().get(url)

        # Assert
        assert response.status_code == 403

    def test_detail_without_login_returns_403(self) -> None:
        # Arrange
        url = reverse("get_friend", args=[1])

        # Act
        response = APIClient().get(url)

        # Assert
        assert response.status_code == 403

    def test_list_shows_only_user_friends(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        other_owner = User.objects.create_user(username="bia")
        friend = create_friend_for_owner(owner, "Ana")
        create_friend_for_owner(other_owner, "Bia")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.get(reverse("list_friends"))

        # Assert
        assert response.status_code == 200
        assert [friend_data["id"] for friend_data in response.data] == [friend.id]

    def test_detail_for_other_owner_returns_404(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        other_owner = User.objects.create_user(username="bia")
        friend = create_friend_for_owner(other_owner, "Bia")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.get(reverse("get_friend", args=[friend.id]))

        # Assert
        assert response.status_code == 404

    def test_detail_retorna_ultimo_contato_ultima_nota_e_grupos_ordenados(
        self,
    ) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        friend = create_friend_for_owner(owner, "Ana")
        Contact.objects.create(
            friend=friend,
            kind=Contact.Kind.MESSAGE,
            date=timezone.now() - timedelta(days=4),
            note="Nota antiga",
        )
        recent_contact = Contact.objects.create(
            friend=friend,
            kind=Contact.Kind.CALL,
            date=timezone.now() - timedelta(days=2),
            note="Nota recente",
        )
        group_z = Group.objects.create(
            owner=owner, name="Zoeira", color=Group.Color.NEUTRAL
        )
        group_a = Group.objects.create(
            owner=owner, name="friends", color=Group.Color.FAMILY
        )
        friend.groups.add(group_z, group_a)
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.get(reverse("get_friend", args=[friend.id]))

        # Assert
        assert response.status_code == 200
        assert response.data == {
            "id": friend.id,
            "name": "Ana",
            "ritmo_quantidade": 30,
            "ritmo_unidade": Friend.CadenceUnit.DAY,
            "coluna": "on_track",
            "last_contact": timezone.localtime(recent_contact.date).isoformat(),
            "last_note": "Nota recente",
            "groups": [
                {"id": group_a.id, "name": "friends", "color": Group.Color.FAMILY},
                {"id": group_z.id, "name": "Zoeira", "color": Group.Color.NEUTRAL},
            ],
        }

    def test_friend_without_contact_is_overdue(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        friend = create_friend_for_owner(owner, "Ana")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.get(reverse("list_friends"))

        # Assert
        assert response.data[0]["id"] == friend.id
        assert response.data[0]["coluna"] == "overdue"
        assert response.data[0]["last_contact"] is None
        assert response.data[0]["last_note"] is None

    def test_grupo_de_outro_dono_nao_aparece_na_resposta(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        other_owner = User.objects.create_user(username="bia")
        friend = create_friend_for_owner(owner, "Ana")
        other_owner_group = Group.objects.create(
            owner=other_owner, name="Privado", color=Group.Color.NEUTRAL
        )
        friend.groups.add(other_owner_group)
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.get(reverse("get_friend", args=[friend.id]))

        # Assert
        assert response.status_code == 200
        assert response.data["groups"] == []

    def test_list_sorts_columns_and_friends_by_urgency(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        # Created out of expected order to detect accidental sorting by ID.
        create_friend_for_owner(owner, "Falei ontem", days_since_contact=1)
        create_friend_for_owner(owner, "Em dia longe", days_since_contact=2)
        create_friend_for_owner(owner, "Essa semana longe", days_since_contact=24)
        create_friend_for_owner(owner, "Atraso menor", days_since_contact=35)
        create_friend_for_owner(owner, "Falei hoje", days_since_contact=0)
        create_friend_for_owner(owner, "Em dia perto", days_since_contact=20)
        create_friend_for_owner(owner, "Essa semana perto", days_since_contact=28)
        create_friend_for_owner(owner, "Atraso maior", days_since_contact=60)
        create_friend_for_owner(owner, "Nunca")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.get(reverse("list_friends"))

        # Assert
        assert [friend_data["name"] for friend_data in response.data] == [
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

    def test_overdue_friends_use_day_and_cadence_proportion_for_sorting(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        create_friend_for_owner(
            owner, "Mais dias absolutos", cadence_in_days=30, days_since_contact=40
        )
        create_friend_for_owner(
            owner, "Mais atrasado no ritmo", cadence_in_days=10, days_since_contact=20
        )
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.get(reverse("list_friends"))

        # Assert
        assert [friend_data["name"] for friend_data in response.data] == [
            "Mais atrasado no ritmo",
            "Mais dias absolutos",
        ]

    def test_tie_na_urgencia_usa_nome_para_ordenar(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        create_friend_for_owner(owner, "Bia", days_since_contact=25)
        create_friend_for_owner(owner, "Ana", days_since_contact=25)
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.get(reverse("list_friends"))

        # Assert
        assert [friend_data["name"] for friend_data in response.data] == ["Ana", "Bia"]

    def test_gets_for_friends_are_throttled_per_user(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        responses = [client.get(reverse("list_friends")) for _ in range(61)]

        # Assert
        assert all(response.status_code == 200 for response in responses[:60])
        assert responses[60].status_code == 429

    def test_list_does_not_add_queries_per_friend(
        self, django_assert_num_queries: Callable[[int], AbstractContextManager[None]]
    ) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        grupo = Group.objects.create(
            owner=owner, name="Group", color=Group.Color.NEUTRAL
        )
        primeiro = create_friend_for_owner(owner, "Friend 1", days_since_contact=2)
        primeiro.groups.add(grupo)
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        with CaptureQueriesContext(connection) as queries_with_one_friend:
            response = client.get(reverse("list_friends"))
            assert response.status_code == 200

        for indice in range(2, 6):
            friend = create_friend_for_owner(
                owner, f"Friend {indice}", days_since_contact=indice
            )
            friend.groups.add(grupo)

        with django_assert_num_queries(len(queries_with_one_friend)):
            response = client.get(reverse("list_friends"))

        # Assert
        assert response.status_code == 200
        assert len(response.data) == 5
