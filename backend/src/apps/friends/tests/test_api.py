"""API contract for reading and writing friends on the board."""

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
        import uuid

        url = reverse("get_friend", args=[uuid.uuid4()])

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
        assert [friend_data["id"] for friend_data in response.data] == [str(friend.id)]

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

    def test_detail_returns_last_contact_last_note_and_sorted_groups(
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
            owner=owner, name="amigos", color=Group.Color.FAMILY
        )
        friend.groups.add(group_z, group_a)
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.get(reverse("get_friend", args=[friend.id]))

        # Assert
        assert response.status_code == 200
        assert response.data == {
            "id": str(friend.id),
            "name": "Ana",
            "birthday": None,
            "is_birthday_today": False,
            "cadence_amount": 30,
            "cadence_unit": Friend.CadenceUnit.DAY,
            "column": "on_track",
            "last_contact_at": timezone.localtime(recent_contact.date).isoformat(),
            "last_note": "Nota recente",
            "groups": [
                {"id": str(group_a.id), "name": "amigos", "color": "family"},
                {"id": str(group_z.id), "name": "Zoeira", "color": "neutral"},
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
        assert response.data[0]["id"] == str(friend.id)
        assert response.data[0]["column"] == "overdue"
        assert response.data[0]["last_contact_at"] is None
        assert response.data[0]["last_note"] is None

    def test_other_owner_group_not_in_response(self) -> None:
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

    def test_tie_in_urgency_uses_name_for_sorting(self) -> None:
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
        group = Group.objects.create(
            owner=owner, name="Group", color=Group.Color.NEUTRAL
        )
        first_friend = create_friend_for_owner(owner, "Friend 1", days_since_contact=2)
        first_friend.groups.add(group)
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        with CaptureQueriesContext(connection) as queries_with_one_friend:
            response = client.get(reverse("list_friends"))
            assert response.status_code == 200

        for index in range(2, 6):
            friend = create_friend_for_owner(
                owner, f"Friend {index}", days_since_contact=index
            )
            friend.groups.add(group)

        with django_assert_num_queries(len(queries_with_one_friend)):
            response = client.get(reverse("list_friends"))

        # Assert
        assert response.status_code == 200
        assert len(response.data) == 5


@pytest.mark.django_db
class TestFriendsWriteAPI:
    def test_create_friend_returns_board_fields_and_owned_groups(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        group = Group.objects.create(
            owner=owner, name="Família", color=Group.Color.FAMILY
        )
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.post(
            reverse("list_friends"),
            {
                "name": "Bia",
                "cadence_amount": 2,
                "cadence_unit": Friend.CadenceUnit.WEEK,
                "groups": [group.id],
            },
        )

        # Assert
        assert response.status_code == 201
        friend = Friend.objects.get(pk=response.data["id"])
        assert friend.owner == owner
        assert response.data == {
            "id": str(friend.id),
            "name": "Bia",
            "birthday": None,
            "is_birthday_today": False,
            "cadence_amount": 2,
            "cadence_unit": Friend.CadenceUnit.WEEK,
            "column": "overdue",
            "last_contact_at": None,
            "last_note": None,
            "groups": [{"id": str(group.id), "name": "Família", "color": "family"}],
        }

    def test_create_friend_ignores_owner_in_body(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        other_owner = User.objects.create_user(username="bia")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.post(
            reverse("list_friends"),
            {
                "name": "Caio",
                "cadence_amount": 1,
                "cadence_unit": Friend.CadenceUnit.MONTH,
                "owner": other_owner.id,
            },
        )

        # Assert
        assert response.status_code == 201
        assert Friend.objects.get(pk=response.data["id"]).owner == owner

    def test_create_friend_with_other_owner_group_returns_400(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        other_owner = User.objects.create_user(username="bia")
        group = Group.objects.create(
            owner=other_owner, name="Privado", color=Group.Color.NEUTRAL
        )
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.post(
            reverse("list_friends"),
            {
                "name": "Caio",
                "cadence_amount": 1,
                "cadence_unit": Friend.CadenceUnit.MONTH,
                "groups": [group.id],
            },
        )

        # Assert
        assert response.status_code == 400
        assert response.data["type"] == "validation_error"
        assert any(error["attr"] == "groups" for error in response.data["errors"])
        assert not Friend.objects.filter(owner=owner).exists()

    def test_create_friend_with_zero_cadence_returns_400(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.post(
            reverse("list_friends"),
            {"name": "Caio", "cadence_amount": 0, "cadence_unit": "day"},
        )

        # Assert
        assert response.status_code == 400
        assert response.data["type"] == "validation_error"
        assert any(
            error["attr"] == "cadence_amount" for error in response.data["errors"]
        )
        assert not Friend.objects.filter(owner=owner).exists()

    def test_patch_friend_updates_fields_and_replaces_groups(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        friend = create_friend_for_owner(owner, "Ana")
        old_group = Group.objects.create(
            owner=owner, name="Antigo", color=Group.Color.NEUTRAL
        )
        new_group = Group.objects.create(
            owner=owner, name="Novo", color=Group.Color.FAMILY
        )
        friend.groups.add(old_group)
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.patch(
            reverse("get_friend", args=[friend.id]),
            {"name": "Ana Maria", "groups": [new_group.id]},
        )

        # Assert
        assert response.status_code == 200
        friend.refresh_from_db()
        assert friend.name == "Ana Maria"
        assert friend.cadence_amount == 30
        assert list(friend.groups.values_list("id", flat=True)) == [new_group.id]
        assert response.data["groups"] == [
            {"id": str(new_group.id), "name": "Novo", "color": "family"}
        ]

    def test_patch_friend_without_groups_keeps_existing_groups(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        friend = create_friend_for_owner(owner, "Ana")
        group = Group.objects.create(
            owner=owner, name="Família", color=Group.Color.FAMILY
        )
        friend.groups.add(group)
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.patch(
            reverse("get_friend", args=[friend.id]), {"name": "Bia"}, format="json"
        )

        # Assert
        assert response.status_code == 200
        assert list(friend.groups.values_list("id", flat=True)) == [group.id]

    def test_patch_friend_with_empty_groups_removes_all_groups(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        friend = create_friend_for_owner(owner, "Ana")
        group = Group.objects.create(
            owner=owner, name="Família", color=Group.Color.FAMILY
        )
        friend.groups.add(group)
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.patch(
            reverse("get_friend", args=[friend.id]), {"groups": []}, format="json"
        )

        # Assert
        assert response.status_code == 200
        assert not friend.groups.exists()
        assert response.data["groups"] == []

    def test_patch_other_owner_friend_returns_404_without_change(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        other_owner = User.objects.create_user(username="bia")
        friend = create_friend_for_owner(other_owner, "Bia")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.patch(
            reverse("get_friend", args=[friend.id]), {"name": "Alterado"}
        )

        # Assert
        assert response.status_code == 404
        friend.refresh_from_db()
        assert friend.name == "Bia"

    def test_patch_friend_with_other_owner_group_returns_400_without_change(
        self,
    ) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        other_owner = User.objects.create_user(username="bia")
        friend = create_friend_for_owner(owner, "Ana")
        group = Group.objects.create(
            owner=other_owner, name="Privado", color=Group.Color.NEUTRAL
        )
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.patch(
            reverse("get_friend", args=[friend.id]),
            {"name": "Alterado", "groups": [group.id]},
        )

        # Assert
        assert response.status_code == 400
        assert response.data["type"] == "validation_error"
        assert any(error["attr"] == "groups" for error in response.data["errors"])
        friend.refresh_from_db()
        assert friend.name == "Ana"
        assert not friend.groups.exists()

    def test_delete_friend_removes_contacts_but_keeps_group(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        friend = create_friend_for_owner(owner, "Ana", days_since_contact=2)
        group = Group.objects.create(
            owner=owner, name="Família", color=Group.Color.FAMILY
        )
        friend.groups.add(group)
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.delete(reverse("get_friend", args=[friend.id]))

        # Assert
        assert response.status_code == 204
        assert not Friend.objects.filter(pk=friend.id).exists()
        assert not Contact.objects.filter(friend_id=friend.id).exists()
        assert Group.objects.filter(pk=group.id).exists()

    def test_delete_other_owner_friend_returns_404_without_change(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        other_owner = User.objects.create_user(username="bia")
        friend = create_friend_for_owner(other_owner, "Bia")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.delete(reverse("get_friend", args=[friend.id]))

        # Assert
        assert response.status_code == 404
        assert Friend.objects.filter(pk=friend.id).exists()

    def test_write_without_login_returns_403(self) -> None:
        # Arrange
        url = reverse("list_friends")

        # Act
        response = APIClient().post(
            url, {"name": "Ana", "cadence_amount": 1, "cadence_unit": "day"}
        )

        # Assert
        assert response.status_code == 403

    def test_write_without_csrf_returns_403(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        client = APIClient(enforce_csrf_checks=True)
        client.force_login(owner)

        # Act
        response = client.post(
            reverse("list_friends"),
            {"name": "Ana", "cadence_amount": 1, "cadence_unit": "day"},
        )

        # Assert
        assert response.status_code == 403


@pytest.mark.django_db
class TestFriendBirthdayAPI:
    def test_birthday_today_is_returned_in_all_friend_representations(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        created = client.post(
            reverse("list_friends"),
            {
                "name": "Bia",
                "cadence_amount": 1,
                "cadence_unit": "month",
                "birthday": "22/10",
                "is_birthday_today": False,
            },
            format="json",
        )
        friend_id = created.data["id"]
        listed = client.get(reverse("list_friends"))
        detail = client.get(reverse("get_friend", args=[friend_id]))
        contact = client.post(
            reverse("record_contact", args=[friend_id]), {"kind": "call"}
        )
        cleared = client.patch(
            reverse("get_friend", args=[friend_id]),
            {"birthday": None, "is_birthday_today": True},
            format="json",
        )

        # Assert
        assert created.status_code == 201
        assert listed.status_code == 200
        assert detail.status_code == 200
        assert contact.status_code == 201
        assert cleared.status_code == 200
        assert created.data["is_birthday_today"] is True
        assert listed.data[0]["is_birthday_today"] is True
        assert detail.data["is_birthday_today"] is True
        assert contact.data["is_birthday_today"] is True
        assert cleared.data["is_birthday_today"] is False

    @pytest.mark.parametrize(
        "birthday_day,birthday_month", [(21, 10), (22, 9), (None, None)]
    )
    def test_birthday_not_today_returns_false(
        self, birthday_day: int | None, birthday_month: int | None
    ) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        friend = create_friend_for_owner(owner, "Ana")
        friend.birthday_day = birthday_day
        friend.birthday_month = birthday_month
        friend.save(update_fields=["birthday_day", "birthday_month"])
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.get(reverse("get_friend", args=[friend.id]))

        # Assert
        assert response.status_code == 200
        assert response.data["is_birthday_today"] is False

    def test_birthday_changes_at_sao_paulo_midnight_even_with_utc_active(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        friend = create_friend_for_owner(owner, "Ana")
        friend.birthday_day = 22
        friend.birthday_month = 10
        friend.save(update_fields=["birthday_day", "birthday_month"])
        client = APIClient()
        client.force_authenticate(owner)
        url = reverse("get_friend", args=[friend.id])

        # Act
        with timezone.override("UTC"):
            with time_machine.travel("2026-10-22T02:59:59Z", tick=False):
                before = client.get(url)
            with time_machine.travel("2026-10-22T03:00:00Z", tick=False):
                birthday = client.get(url)
            with time_machine.travel("2026-10-23T03:00:00Z", tick=False):
                after = client.get(url)

        # Assert
        assert before.status_code == birthday.status_code == after.status_code == 200
        assert before.data["is_birthday_today"] is False
        assert birthday.data["is_birthday_today"] is True
        assert after.data["is_birthday_today"] is False

    @pytest.mark.parametrize(
        "today",
        ["2024-02-29T15:00:00Z", "2025-02-28T15:00:00Z", "2100-02-28T15:00:00Z"],
    )
    def test_leap_day_birthday_matches_last_day_of_february(self, today: str) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        friend = create_friend_for_owner(owner, "Ana")
        friend.birthday_day = 29
        friend.birthday_month = 2
        friend.save(update_fields=["birthday_day", "birthday_month"])
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        with time_machine.travel(today, tick=False):
            response = client.get(reverse("get_friend", args=[friend.id]))

        # Assert
        assert response.status_code == 200
        assert response.data["birthday"] == "29/02"
        assert response.data["is_birthday_today"] is True

    @pytest.mark.parametrize("today", ["2024-02-28T15:00:00Z", "2025-03-01T15:00:00Z"])
    def test_leap_day_birthday_does_not_match_other_dates(self, today: str) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        friend = create_friend_for_owner(owner, "Ana")
        friend.birthday_day = 29
        friend.birthday_month = 2
        friend.save(update_fields=["birthday_day", "birthday_month"])
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        with time_machine.travel(today, tick=False):
            response = client.get(reverse("get_friend", args=[friend.id]))

        # Assert
        assert response.status_code == 200
        assert response.data["is_birthday_today"] is False

    @pytest.mark.parametrize("birthday", ["29/02", "01/09", "31/12", None])
    def test_create_friend_accepts_birthday(self, birthday: str | None) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.post(
            reverse("list_friends"),
            {
                "name": "Bia",
                "cadence_amount": 1,
                "cadence_unit": "month",
                "birthday": birthday,
            },
            format="json",
        )

        # Assert
        assert response.status_code == 201
        assert response.data["birthday"] == birthday
        friend = Friend.objects.get(pk=response.data["id"])
        if birthday is None:
            assert friend.birthday_day is None
            assert friend.birthday_month is None
        else:
            assert friend.birthday_day == int(birthday[:2])
            assert friend.birthday_month == int(birthday[3:])

    @pytest.mark.parametrize(
        "birthday",
        [
            "31/04",
            "30/02",
            "00/01",
            "01/00",
            "01/13",
            "32/01",
            "1/02",
            "01/2",
            "12/3",
            "1/",
            "2000-02-29",
            "29/02/2000",
            "",
            " 01/01",
            "01/01 ",
            "01/01\n",
            "abc01/01",
            "２９/０２",
            2902,
            [],
            {},
        ],
    )
    @pytest.mark.parametrize("request_method", ["post", "patch"])
    def test_invalid_birthday_returns_field_error_without_changing_friend(
        self, birthday: object, request_method: str
    ) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        friend = create_friend_for_owner(owner, "Ana")
        friend.birthday_day = 29
        friend.birthday_month = 2
        friend.save(update_fields=["birthday_day", "birthday_month"])
        client = APIClient()
        client.force_authenticate(owner)
        body = {
            "name": "Bia",
            "cadence_amount": 1,
            "cadence_unit": "month",
            "birthday": birthday,
        }

        # Act
        if request_method == "post":
            response = client.post(reverse("list_friends"), body, format="json")
        else:
            response = client.patch(
                reverse("get_friend", args=[friend.id]), body, format="json"
            )

        # Assert
        assert response.status_code == 400
        assert response.data["type"] == "validation_error"
        assert any(
            error["attr"] == "birthday"
            and error["detail"] == "Essa data não existe. Ex.: 12/03."
            for error in response.data["errors"]
        )
        friend.refresh_from_db()
        assert friend.name == "Ana"
        assert friend.birthday_day == 29
        assert friend.birthday_month == 2
        assert Friend.objects.count() == 1

    @pytest.mark.parametrize("birthday", ["01/09", None])
    def test_patch_friend_replaces_or_clears_birthday(
        self, birthday: str | None
    ) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        friend = create_friend_for_owner(owner, "Ana")
        friend.birthday_day = 29
        friend.birthday_month = 2
        friend.save(update_fields=["birthday_day", "birthday_month"])
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.patch(
            reverse("get_friend", args=[friend.id]),
            {"birthday": birthday},
            format="json",
        )

        # Assert
        assert response.status_code == 200
        assert response.data["birthday"] == birthday
        friend.refresh_from_db()
        if birthday is None:
            assert friend.birthday_day is None
            assert friend.birthday_month is None
        else:
            assert friend.birthday_day == 1
            assert friend.birthday_month == 9

    def test_patch_without_birthday_preserves_existing_birthday(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        friend = create_friend_for_owner(owner, "Ana")
        friend.birthday_day = 29
        friend.birthday_month = 2
        friend.save(update_fields=["birthday_day", "birthday_month"])
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.patch(
            reverse("get_friend", args=[friend.id]), {"name": "Bia"}, format="json"
        )

        # Assert
        assert response.status_code == 200
        friend.refresh_from_db()
        assert friend.name == "Bia"
        assert friend.birthday_day == 29
        assert friend.birthday_month == 2
        assert response.data["birthday"] == "29/02"

    def test_list_and_detail_return_formatted_birthday(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        friend = create_friend_for_owner(owner, "Ana")
        friend.birthday_day = 1
        friend.birthday_month = 9
        friend.save(update_fields=["birthday_day", "birthday_month"])
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        list_response = client.get(reverse("list_friends"))
        detail_response = client.get(reverse("get_friend", args=[friend.id]))

        # Assert
        assert list_response.status_code == 200
        assert detail_response.status_code == 200
        assert list_response.data[0]["birthday"] == "01/09"
        assert detail_response.data["birthday"] == "01/09"


@pytest.mark.django_db
class TestContactsAPI:
    def test_record_contact_updates_board_friend(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        friend = create_friend_for_owner(owner, "Bia")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.post(
            reverse("record_contact", args=[friend.id]),
            {"kind": Contact.Kind.CALL, "note": "Conversa boa"},
        )

        # Assert
        assert response.status_code == 201
        contact = Contact.objects.get(friend=friend)
        assert response.data["contact_id"] == str(contact.id)
        assert contact.date == timezone.now()
        assert response.data["column"] == "just_talked"
        assert (
            response.data["last_contact_at"]
            == timezone.localtime(contact.date).isoformat()
        )
        assert response.data["last_note"] == "Conversa boa"

    def test_undo_contact_restores_previous_board_column(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        friend = create_friend_for_owner(owner, "Bia", days_since_contact=30)
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        record_response = client.post(
            reverse("record_contact", args=[friend.id]),
            {"kind": Contact.Kind.CALL},
        )
        response = client.delete(
            reverse(
                "undo_contact", args=[friend.id, record_response.data["contact_id"]]
            )
        )
        friend_response = client.get(reverse("get_friend", args=[friend.id]))

        # Assert
        assert record_response.status_code == 201
        assert response.status_code == 204
        assert not Contact.objects.filter(
            pk=record_response.data["contact_id"]
        ).exists()
        assert friend_response.data["column"] == "overdue"

    def test_record_contact_with_invalid_kind_returns_400(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        friend = create_friend_for_owner(owner, "Bia")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.post(
            reverse("record_contact", args=[friend.id]), {"kind": "fax"}
        )

        # Assert
        assert response.status_code == 400
        assert response.data["errors"][0]["detail"] == (
            "Tipo de contato inválido. Use message, call ou meeting."
        )
        assert not Contact.objects.filter(friend=friend).exists()

    def test_record_contact_ignores_date_in_request(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        friend = create_friend_for_owner(owner, "Bia")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.post(
            reverse("record_contact", args=[friend.id]),
            {"kind": Contact.Kind.MESSAGE, "date": "2000-01-01T00:00:00Z"},
        )

        # Assert
        assert response.status_code == 201
        contact = Contact.objects.get(friend=friend)
        assert contact.date == timezone.now()
        assert contact.note == ""

    def test_record_contact_for_other_owner_returns_404(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        other_owner = User.objects.create_user(username="bia")
        friend = create_friend_for_owner(other_owner, "Bia")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.post(
            reverse("record_contact", args=[friend.id]), {"kind": Contact.Kind.CALL}
        )

        # Assert
        assert response.status_code == 404
        assert not Contact.objects.filter(friend=friend).exists()

    def test_undo_contact_for_other_owner_returns_404(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        other_owner = User.objects.create_user(username="bia")
        friend = create_friend_for_owner(other_owner, "Bia", days_since_contact=1)
        contact = Contact.objects.get(friend=friend)
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.delete(reverse("undo_contact", args=[friend.id, contact.id]))

        # Assert
        assert response.status_code == 404
        assert Contact.objects.filter(pk=contact.id).exists()

    def test_undo_contact_from_different_friend_returns_404(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        friend = create_friend_for_owner(owner, "Bia")
        another_friend = create_friend_for_owner(owner, "Caio", days_since_contact=1)
        contact = Contact.objects.get(friend=another_friend)
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.delete(reverse("undo_contact", args=[friend.id, contact.id]))

        # Assert
        assert response.status_code == 404
        assert Contact.objects.filter(pk=contact.id).exists()

    def test_record_contact_without_login_returns_403(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        friend = create_friend_for_owner(owner, "Bia")

        # Act
        response = APIClient().post(
            reverse("record_contact", args=[friend.id]), {"kind": Contact.Kind.CALL}
        )

        # Assert
        assert response.status_code == 403

    def test_undo_contact_without_login_returns_403(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        friend = create_friend_for_owner(owner, "Bia", days_since_contact=1)
        contact = Contact.objects.get(friend=friend)

        # Act
        response = APIClient().delete(
            reverse("undo_contact", args=[friend.id, contact.id])
        )

        # Assert
        assert response.status_code == 403


@pytest.mark.django_db
class TestGroupsReadAPI:
    def test_list_returns_owned_groups_in_name_order_with_friend_counts(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        other_owner = User.objects.create_user(username="bia")
        group_z = Group.objects.create(
            owner=owner, name="Zoeira", color=Group.Color.NEUTRAL
        )
        group_a = Group.objects.create(
            owner=owner, name="amigos", color=Group.Color.FAMILY
        )
        Group.objects.create(owner=other_owner, name="Privado", color=Group.Color.WORK)
        for name in ("Bia", "Caio", "Duda"):
            create_friend_for_owner(owner, name).groups.add(group_z)
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.get(reverse("list_groups"))

        # Assert
        assert response.status_code == 200
        assert response.data == [
            {
                "id": str(group_a.id),
                "name": "amigos",
                "color": "family",
                "friends_count": 0,
            },
            {
                "id": str(group_z.id),
                "name": "Zoeira",
                "color": "neutral",
                "friends_count": 3,
            },
        ]

    def test_list_does_not_add_queries_per_group(
        self, django_assert_num_queries: Callable[[int], AbstractContextManager[None]]
    ) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        Group.objects.create(owner=owner, name="A", color=Group.Color.NEUTRAL)
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        with CaptureQueriesContext(connection) as queries_with_one_group:
            response = client.get(reverse("list_groups"))
            assert response.status_code == 200

        for name in ("B", "C", "D", "E"):
            Group.objects.create(owner=owner, name=name, color=Group.Color.NEUTRAL)

        with django_assert_num_queries(len(queries_with_one_group)):
            response = client.get(reverse("list_groups"))

        # Assert
        assert response.status_code == 200
        assert len(response.data) == 5

    def test_list_without_login_returns_403(self) -> None:
        # Arrange
        url = reverse("list_groups")

        # Act
        response = APIClient().get(url)

        # Assert
        assert response.status_code == 403


@pytest.mark.django_db
class TestGroupsCreateAPI:
    def test_create_without_login_returns_403(self) -> None:
        # Arrange
        url = reverse("list_groups")

        # Act
        response = APIClient().post(
            url, {"name": "Família", "color": Group.Color.FAMILY}
        )

        # Assert
        assert response.status_code == 403

    def test_create_returns_group_and_uses_authenticated_owner(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        other_owner = User.objects.create_user(username="bia")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.post(
            reverse("list_groups"),
            {"name": "Família", "color": Group.Color.FAMILY, "owner": other_owner.id},
        )

        # Assert
        assert response.status_code == 201
        group = Group.objects.get(pk=response.data["id"])
        assert group.owner == owner
        assert response.data == {
            "id": str(group.id),
            "name": "Família",
            "color": "family",
            "friends_count": 0,
        }

    def test_create_with_invalid_color_returns_400(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.post(
            reverse("list_groups"), {"name": "Família", "color": "red"}
        )

        # Assert
        assert response.status_code == 400
        assert any(error["attr"] == "color" for error in response.data["errors"])
        assert not Group.objects.exists()

    def test_create_with_same_name_in_different_case_returns_400(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        Group.objects.create(owner=owner, name="Família", color=Group.Color.FAMILY)
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.post(
            reverse("list_groups"),
            {"name": "família", "color": Group.Color.NEUTRAL},
        )

        # Assert
        assert response.status_code == 400
        assert response.data["errors"] == [
            {
                "code": "invalid",
                "detail": "Você já tem um grupo com esse nome.",
                "attr": "name",
            }
        ]
        assert Group.objects.count() == 1

    def test_create_accepts_name_used_by_another_owner(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        other_owner = User.objects.create_user(username="bia")
        Group.objects.create(
            owner=other_owner, name="Família", color=Group.Color.FAMILY
        )
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.post(
            reverse("list_groups"),
            {"name": "família", "color": Group.Color.NEUTRAL},
        )

        # Assert
        assert response.status_code == 201
        assert Group.objects.filter(owner=owner, name="família").exists()


@pytest.mark.django_db
class TestGroupsUpdateAPI:
    def test_patch_updates_name_and_color_for_group_and_friend(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        group = Group.objects.create(
            owner=owner, name="futebol", color=Group.Color.NEUTRAL
        )
        friend = create_friend_for_owner(owner, "Bia")
        friend.groups.add(group)
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.patch(
            reverse("group_detail", args=[group.id]),
            {"name": "Futebol", "color": Group.Color.FAMILY},
        )
        friend_response = client.get(reverse("get_friend", args=[friend.id]))

        # Assert
        assert response.status_code == 200
        assert response.data == {
            "id": str(group.id),
            "name": "Futebol",
            "color": "family",
            "friends_count": 1,
        }
        assert friend_response.data["groups"] == [
            {"id": str(group.id), "name": "Futebol", "color": "family"}
        ]

    def test_patch_only_color_keeps_name(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        group = Group.objects.create(
            owner=owner, name="Família", color=Group.Color.FAMILY
        )
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.patch(
            reverse("group_detail", args=[group.id]), {"color": Group.Color.WORK}
        )

        # Assert
        assert response.status_code == 200
        assert response.data["name"] == "Família"
        assert response.data["color"] == "work"

    def test_patch_to_another_group_name_returns_400_without_change(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        group = Group.objects.create(
            owner=owner, name="Trabalho", color=Group.Color.WORK
        )
        Group.objects.create(owner=owner, name="Família", color=Group.Color.FAMILY)
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.patch(
            reverse("group_detail", args=[group.id]), {"name": "família"}
        )

        # Assert
        assert response.status_code == 400
        assert response.data["errors"][0]["detail"] == (
            "Você já tem um grupo com esse nome."
        )
        group.refresh_from_db()
        assert group.name == "Trabalho"

    def test_patch_other_owner_group_returns_404_without_change(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        other_owner = User.objects.create_user(username="bia")
        group = Group.objects.create(
            owner=other_owner, name="Privado", color=Group.Color.NEUTRAL
        )
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.patch(
            reverse("group_detail", args=[group.id]), {"name": "Alterado"}
        )

        # Assert
        assert response.status_code == 404
        group.refresh_from_db()
        assert group.name == "Privado"

    def test_patch_without_login_returns_403(self) -> None:
        # Arrange
        import uuid

        url = reverse("group_detail", args=[uuid.uuid4()])

        # Act
        response = APIClient().patch(url, {"name": "Alterado"})

        # Assert
        assert response.status_code == 403


@pytest.mark.django_db
class TestGroupsDeleteAPI:
    def test_delete_removes_group_link_but_keeps_friend(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        group = Group.objects.create(
            owner=owner, name="Família", color=Group.Color.FAMILY
        )
        friend = create_friend_for_owner(owner, "Bia")
        friend.groups.add(group)
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.delete(reverse("group_detail", args=[group.id]))
        friend_response = client.get(reverse("get_friend", args=[friend.id]))

        # Assert
        assert response.status_code == 204
        assert not Group.objects.filter(pk=group.id).exists()
        assert Friend.objects.filter(pk=friend.id).exists()
        assert friend_response.data["groups"] == []

    def test_delete_other_owner_group_returns_404_without_change(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        other_owner = User.objects.create_user(username="bia")
        group = Group.objects.create(
            owner=other_owner, name="Privado", color=Group.Color.NEUTRAL
        )
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.delete(reverse("group_detail", args=[group.id]))

        # Assert
        assert response.status_code == 404
        assert Group.objects.filter(pk=group.id).exists()

    def test_delete_without_login_returns_403(self) -> None:
        # Arrange
        import uuid

        url = reverse("group_detail", args=[uuid.uuid4()])

        # Act
        response = APIClient().delete(url)

        # Assert
        assert response.status_code == 403


@pytest.mark.django_db
class TestUUIDPrimaryKeys:
    """Validate UUID primary keys for Friend, Group, and Contact models."""

    def test_create_friend_returns_uuid_id(self) -> None:
        # Arrange
        import uuid

        owner = User.objects.create_user(username="ana")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.post(
            reverse("list_friends"),
            {
                "name": "Bia",
                "cadence_amount": 2,
                "cadence_unit": Friend.CadenceUnit.WEEK,
            },
        )

        # Assert
        assert response.status_code == 201
        friend_id = response.data["id"]
        assert isinstance(friend_id, str)
        # Should be a valid UUID
        uuid.UUID(friend_id)

    def test_create_group_returns_uuid_id(self) -> None:
        # Arrange
        import uuid

        owner = User.objects.create_user(username="ana")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.post(
            reverse("list_groups"),
            {"name": "Família", "color": Group.Color.FAMILY},
        )

        # Assert
        assert response.status_code == 201
        group_id = response.data["id"]
        assert isinstance(group_id, str)
        # Should be a valid UUID
        uuid.UUID(group_id)

    def test_get_friend_by_uuid_succeeds(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        friend = create_friend_for_owner(owner, "Ana")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.get(reverse("get_friend", args=[friend.id]))

        # Assert
        assert response.status_code == 200
        assert str(friend.id) == response.data["id"]

    def test_get_friend_by_invalid_uuid_returns_404(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        client = APIClient()
        client.force_authenticate(owner)

        # Act - Django URL resolver won't match invalid UUID, so we get 404 directly
        response = client.get("/api/friends/not-a-uuid/")

        # Assert
        assert response.status_code == 404

    def test_get_friend_by_unknown_uuid_returns_404(self) -> None:
        # Arrange
        import uuid

        owner = User.objects.create_user(username="ana")
        unknown_uuid = uuid.uuid4()
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.get(reverse("get_friend", args=[unknown_uuid]))

        # Assert
        assert response.status_code == 404

    def test_patch_friend_by_uuid_succeeds(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        friend = create_friend_for_owner(owner, "Ana")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.patch(
            reverse("get_friend", args=[friend.id]), {"name": "Ana Maria"}
        )

        # Assert
        assert response.status_code == 200
        assert response.data["name"] == "Ana Maria"

    def test_delete_friend_by_uuid_succeeds(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        friend = create_friend_for_owner(owner, "Ana")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.delete(reverse("get_friend", args=[friend.id]))

        # Assert
        assert response.status_code == 204
        assert not Friend.objects.filter(pk=friend.id).exists()

    def test_create_friend_with_invalid_group_uuid_returns_400(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.post(
            reverse("list_friends"),
            {
                "name": "Bia",
                "cadence_amount": 2,
                "cadence_unit": Friend.CadenceUnit.WEEK,
                "groups": ["not-a-uuid"],
            },
        )

        # Assert
        assert response.status_code == 400
        assert response.data["type"] == "validation_error"
        assert any(error["attr"] == "groups" for error in response.data["errors"])

    def test_patch_group_by_uuid_succeeds(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        group = Group.objects.create(
            owner=owner, name="Futebol", color=Group.Color.NEUTRAL
        )
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.patch(
            reverse("group_detail", args=[group.id]), {"name": "Futsal"}
        )

        # Assert
        assert response.status_code == 200
        assert response.data["name"] == "Futsal"

    def test_delete_group_by_uuid_succeeds(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        group = Group.objects.create(
            owner=owner, name="Família", color=Group.Color.FAMILY
        )
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.delete(reverse("group_detail", args=[group.id]))

        # Assert
        assert response.status_code == 204
        assert not Group.objects.filter(pk=group.id).exists()

    def test_list_friends_returns_groups_with_uuid_ids(self) -> None:
        # Arrange
        import uuid

        owner = User.objects.create_user(username="ana")
        friend = create_friend_for_owner(owner, "Ana")
        group = Group.objects.create(
            owner=owner, name="Família", color=Group.Color.FAMILY
        )
        friend.groups.add(group)
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.get(reverse("list_friends"))

        # Assert
        assert response.status_code == 200
        friend_data = response.data[0]
        assert len(friend_data["groups"]) == 1
        group_id = friend_data["groups"][0]["id"]
        assert isinstance(group_id, str)
        # Should be a valid UUID
        uuid.UUID(group_id)
