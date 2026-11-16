"""Atomic address-book imports through the authenticated public endpoint."""

import json
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from typing import TypedDict
from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from django.core.cache import cache
from django.db import DatabaseError, connection, connections
from django.test import override_settings
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework.test import APIClient

from apps.friends.models import Friend, Group
from apps.friends.services.bulk_import import FriendBulkImportService
from apps.friends.services.friends import FriendsService

BRAZILIAN_PHONE = "+5511999999999"
PORTUGUESE_PHONE = "+351912345678"


class ConcurrentImportCounts(TypedDict):
    created: int
    ignored: int


@pytest.fixture(autouse=True)
def clear_import_throttle_cache() -> None:
    """Keep independent import scenarios out of the shared rate-limit counter."""
    cache.clear()


@pytest.fixture
def import_owner() -> User:
    """Return an owner without friends, for isolation assertions."""
    return User.objects.create_user(username="ana")


@pytest.fixture
def import_client(import_owner: User) -> APIClient:
    """Authenticate the endpoint using the same session permission as other writes."""
    client = APIClient()
    client.force_authenticate(import_owner)
    return client


@pytest.mark.django_db
class TestFriendBulkImportAPI:
    def test_import_without_login_returns_403(self) -> None:
        # Arrange / Act
        response = APIClient().post(
            reverse("import_friends"), {"friends": [{"name": "Bia"}]}, format="json"
        )

        # Assert
        assert response.status_code == 403
        assert not Friend.objects.exists()

    def test_import_reuses_normalization_birthdays_and_server_defaults(
        self, import_client: APIClient, import_owner: User
    ) -> None:
        # Arrange / Act
        response = import_client.post(
            reverse("import_friends"),
            {
                "friends": [
                    {"name": " Ana ", "phone": "(11) 99999-9999", "birthday": "29/02"},
                    {"name": "Bia", "phone": "+351 912 345 678", "birthday": None},
                    {"name": "Caio"},
                ]
            },
            format="json",
        )

        # Assert
        assert response.status_code == 201
        assert response.data["ignored"] == []
        assert [entry["index"] for entry in response.data["created"]] == [0, 1, 2]
        friends = [entry["friend"] for entry in response.data["created"]]
        assert friends[0]["phone"] == BRAZILIAN_PHONE
        assert friends[0]["birthday"] == "29/02"
        assert friends[1]["phone"] == PORTUGUESE_PHONE
        assert friends[2]["phone"] is None
        assert all(friend["cadence_amount"] == 1 for friend in friends)
        assert all(friend["cadence_unit"] == "month" for friend in friends)
        assert all(friend["groups"] == [] for friend in friends)
        assert Friend.objects.filter(owner=import_owner).count() == 3

    def test_caller_cannot_override_owner_cadence_or_groups(
        self, import_client: APIClient, import_owner: User
    ) -> None:
        # Arrange
        other_owner = User.objects.create_user(username="outro")
        group = Group.objects.create(owner=import_owner, name="Família", color="family")

        # Act
        response = import_client.post(
            reverse("import_friends"),
            {
                "friends": [
                    {
                        "name": "Bia",
                        "owner": other_owner.pk,
                        "cadence_amount": 7,
                        "cadence_unit": "year",
                        "groups": [str(group.pk)],
                    }
                ]
            },
            format="json",
        )

        # Assert
        assert response.status_code == 201
        friend = Friend.objects.get()
        assert friend.owner == import_owner
        assert friend.cadence_amount == 1
        assert friend.cadence_unit == "month"
        assert not friend.groups.exists()

    def test_existing_and_internal_duplicates_are_reported_by_input_position(
        self, import_client: APIClient, import_owner: User
    ) -> None:
        # Arrange
        existing = Friend.objects.create(
            owner=import_owner,
            name="Marina",
            phone=BRAZILIAN_PHONE,
            cadence_amount=3,
            cadence_unit="year",
            birthday_day=2,
            birthday_month=5,
        )

        # Act
        response = import_client.post(
            reverse("import_friends"),
            {
                "friends": [
                    {"name": "Outro nome", "phone": "11999999999", "birthday": "01/01"},
                    {"name": "Bia", "phone": PORTUGUESE_PHONE},
                    {"name": "Bia repetida", "phone": "+351 912 345 678"},
                    {"name": "Marina repetida", "phone": BRAZILIAN_PHONE},
                ]
            },
            format="json",
        )

        # Assert
        assert response.status_code == 201
        assert [entry["index"] for entry in response.data["created"]] == [1]
        created_id = response.data["created"][0]["friend"]["id"]
        assert response.data["ignored"] == [
            {"index": 0, "reason": "existing_phone", "friend_id": str(existing.pk)},
            {"index": 2, "reason": "duplicate_phone", "friend_id": created_id},
            {"index": 3, "reason": "duplicate_phone", "friend_id": str(existing.pk)},
        ]
        existing.refresh_from_db()
        assert (existing.name, existing.cadence_amount, existing.birthday_day) == (
            "Marina",
            3,
            2,
        )

    def test_other_owner_phone_is_neither_skipped_nor_disclosed(
        self, import_client: APIClient
    ) -> None:
        # Arrange
        other_owner = User.objects.create_user(username="outro")
        private_friend = Friend.objects.create(
            owner=other_owner,
            name="Nome privado",
            phone=BRAZILIAN_PHONE,
            cadence_amount=1,
            cadence_unit="month",
        )

        # Act
        response = import_client.post(
            reverse("import_friends"),
            {"friends": [{"name": "Bia", "phone": BRAZILIAN_PHONE}]},
            format="json",
        )

        # Assert
        assert response.status_code == 201
        assert len(response.data["created"]) == 1
        assert str(private_friend.id) not in json.dumps(response.data)

    def test_reimport_with_phone_ignores_the_friend_and_preserves_its_data(
        self, import_client: APIClient
    ) -> None:
        # Arrange
        body = {"friends": [{"name": "Bia", "phone": BRAZILIAN_PHONE}]}
        first = import_client.post(reverse("import_friends"), body, format="json")

        # Act
        second = import_client.post(reverse("import_friends"), body, format="json")

        # Assert
        assert second.status_code == 201
        assert second.data["created"] == []
        assert (
            second.data["ignored"][0]["friend_id"]
            == first.data["created"][0]["friend"]["id"]
        )
        assert Friend.objects.count() == 1

    def test_names_and_empty_phones_do_not_prevent_reimport(
        self, import_client: APIClient
    ) -> None:
        # Arrange
        body = {"friends": [{"name": "Bia", "phone": " "}, {"name": "Bia"}]}
        import_client.post(reverse("import_friends"), body, format="json")

        # Act
        response = import_client.post(reverse("import_friends"), body, format="json")

        # Assert
        assert len(response.data["created"]) == 2
        assert response.data["ignored"] == []
        assert Friend.objects.filter(phone__isnull=True).count() == 4

    @pytest.mark.parametrize(
        "invalid_entry",
        [
            {"name": ""},
            {"name": "x" * 101},
            {"name": "Bia", "phone": "123"},
            {"name": "Bia", "birthday": "31/04"},
            {"name": "Bia", "birthday": "12/"},
        ],
    )
    def test_invalid_entry_rejects_every_friend_before_writing(
        self, import_client: APIClient, invalid_entry: dict[str, str]
    ) -> None:
        # Arrange / Act
        response = import_client.post(
            reverse("import_friends"),
            {"friends": [{"name": "Ana válida"}, invalid_entry]},
            format="json",
        )

        # Assert
        assert response.status_code == 400
        assert response.data["errors"][0]["attr"].startswith("friends.1.")
        assert not Friend.objects.exists()

    def test_invalid_fields_on_existing_phone_still_reject_the_whole_batch(
        self, import_client: APIClient, import_owner: User
    ) -> None:
        # Arrange
        Friend.objects.create(
            owner=import_owner,
            name="Bia",
            phone=BRAZILIAN_PHONE,
            cadence_amount=1,
            cadence_unit="month",
        )

        # Act
        response = import_client.post(
            reverse("import_friends"),
            {
                "friends": [
                    {"name": "Ana"},
                    {"name": "", "phone": BRAZILIAN_PHONE},
                ]
            },
            format="json",
        )

        # Assert
        assert response.status_code == 400
        assert Friend.objects.count() == 1

    @pytest.mark.parametrize("friends", [[], None, "invalid", [None]])
    def test_malformed_or_empty_list_is_rejected(
        self, import_client: APIClient, friends: object
    ) -> None:
        # Arrange / Act
        response = import_client.post(
            reverse("import_friends"), {"friends": friends}, format="json"
        )

        # Assert
        assert response.status_code == 400
        assert not Friend.objects.exists()

    def test_more_than_five_thousand_entries_are_rejected(
        self, import_client: APIClient
    ) -> None:
        # Arrange / Act
        response = import_client.post(
            reverse("import_friends"),
            {"friends": [{"name": "Bia"}] * (FriendBulkImportService.MAX_FRIENDS + 1)},
            format="json",
        )

        # Assert
        assert response.status_code == 400
        assert not Friend.objects.exists()

    def test_five_thousand_escaped_unicode_names_fit_the_json_limit(
        self, import_client: APIClient
    ) -> None:
        # Arrange
        body = json.dumps({"friends": [{"name": "𐐀" * 100}] * 5_000})

        # Act
        response = import_client.post(
            reverse("import_friends"), body, content_type="application/json"
        )

        # Assert
        assert response.status_code == 201
        assert len(response.data["created"]) == 5_000
        assert Friend.objects.count() == 5_000

    @override_settings(DATA_UPLOAD_MAX_MEMORY_SIZE=64)
    def test_oversized_json_is_rejected_with_a_recoverable_api_error(
        self, import_client: APIClient
    ) -> None:
        # Arrange / Act
        response = import_client.post(
            reverse("import_friends"), {"friends": [{"name": "x" * 100}]}, format="json"
        )

        # Assert
        assert response.status_code == 413
        assert "Selecione menos" in response.data["errors"][0]["detail"]
        assert not Friend.objects.exists()

    def test_query_count_does_not_grow_per_friend(
        self, import_client: APIClient
    ) -> None:
        # Arrange / Act
        with CaptureQueriesContext(connection) as small_import:
            import_client.post(
                reverse("import_friends"), {"friends": [{"name": "Ana"}]}, format="json"
            )
        with CaptureQueriesContext(connection) as larger_import:
            response = import_client.post(
                reverse("import_friends"),
                {"friends": [{"name": f"Amigo {index}"} for index in range(50)]},
                format="json",
            )

        # Assert
        assert response.status_code == 201
        assert len(larger_import) == len(small_import)
        assert len(larger_import) < 10

    def test_failure_after_insert_rolls_back_all_new_friends(
        self, import_client: APIClient
    ) -> None:
        # Arrange / Act
        with patch.object(FriendsService, "list_friends", side_effect=DatabaseError):
            with pytest.raises(DatabaseError):
                import_client.post(
                    reverse("import_friends"),
                    {
                        "friends": [
                            {"name": "Ana"},
                            {"name": "Bia"},
                        ]
                    },
                    format="json",
                )

        # Assert
        assert not Friend.objects.exists()


@pytest.mark.django_db(transaction=True)
class TestConcurrentFriendImports:
    def test_overlapping_reversed_imports_confirm_exactly_one_creation_per_phone(
        self,
    ) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        barrier = Barrier(2, timeout=10)

        def send_import_for_owner(phones: list[str]) -> ConcurrentImportCounts:
            client = APIClient()
            client.force_authenticate(owner)
            try:
                barrier.wait()
                response = client.post(
                    reverse("import_friends"),
                    {"friends": [{"name": "Bia", "phone": phone} for phone in phones]},
                    format="json",
                )
                assert response.status_code == 201
                return {
                    "created": len(response.data["created"]),
                    "ignored": len(response.data["ignored"]),
                }
            finally:
                connections.close_all()

        # Act
        with ThreadPoolExecutor(max_workers=2) as executor:
            responses = list(
                executor.map(
                    send_import_for_owner,
                    [
                        [BRAZILIAN_PHONE, PORTUGUESE_PHONE],
                        [PORTUGUESE_PHONE, BRAZILIAN_PHONE],
                    ],
                )
            )

        # Assert
        assert Friend.objects.filter(owner=owner).count() == 2
        assert sum(response["created"] for response in responses) == 2
        assert sum(response["ignored"] for response in responses) == 2
