"""Phone storage, owner isolation and public API behavior."""

from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from django.contrib.auth.models import User
from django.core.cache import cache
from django.db import IntegrityError, connection, connections, transaction
from django.db.migrations.executor import MigrationExecutor
from django.urls import reverse
from rest_framework.test import APIClient

from apps.friends.admin.forms import FriendAdminForm
from apps.friends.models import Friend
from apps.friends.models.friend import FRIEND_PHONE_UNIQUE_CONSTRAINT

BRAZILIAN_PHONE = "+5511999999999"


@pytest.fixture(autouse=True)
def clear_phone_throttle_cache() -> None:
    """Isolate API rate limits from other phone scenarios."""
    cache.clear()


@pytest.fixture
def create_phone_friend() -> Callable[..., Friend]:
    """Build friends through the ORM to exercise database constraints as well."""

    def _create_friend(
        owner: User, phone: str | None = None, name: str = "Bia"
    ) -> Friend:
        return Friend.objects.create(
            owner=owner,
            name=name,
            phone=phone,
            cadence_amount=1,
            cadence_unit=Friend.CadenceUnit.MONTH,
        )

    return _create_friend


@pytest.mark.django_db
class TestFriendPhoneAPI:
    @pytest.mark.parametrize(
        "phone",
        ["(11) 99999-9999", "11999999999", "+55 11 99999-9999", "5511999999999"],
    )
    def test_create_normalizes_brazilian_phone(self, phone: str) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.post(
            reverse("list_friends"),
            {
                "name": "Bia",
                "phone": phone,
                "cadence_amount": 1,
                "cadence_unit": "month",
            },
            format="json",
        )

        # Assert
        assert response.status_code == 201
        assert response.data["phone"] == BRAZILIAN_PHONE
        assert Friend.objects.get(pk=response.data["id"]).phone == BRAZILIAN_PHONE

    def test_create_preserves_international_country(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.post(
            reverse("list_friends"),
            {
                "name": "Bia",
                "phone": "+351 912 345 678",
                "cadence_amount": 1,
                "cadence_unit": "month",
            },
            format="json",
        )

        # Assert
        assert response.status_code == 201
        assert response.data["phone"] == "+351912345678"

    @pytest.mark.parametrize("phone", [None, "", "   "])
    def test_empty_phone_is_stored_as_null(self, phone: str | None) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.post(
            reverse("list_friends"),
            {
                "name": "Bia",
                "phone": phone,
                "cadence_amount": 1,
                "cadence_unit": "month",
            },
            format="json",
        )

        # Assert
        assert response.status_code == 201
        assert Friend.objects.get(pk=response.data["id"]).phone is None

    @pytest.mark.parametrize(
        "phone",
        ["123", "Ana +5511999999999", "+55 11 99999-9999 ramal 4", "1" * 65, []],
    )
    def test_invalid_phone_returns_field_error_without_creating_friend(
        self, phone: object
    ) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.post(
            reverse("list_friends"),
            {
                "name": "Bia",
                "phone": phone,
                "cadence_amount": 1,
                "cadence_unit": "month",
            },
            format="json",
        )

        # Assert
        assert response.status_code == 400
        assert response.data["errors"][0]["attr"] == "phone"
        assert not Friend.objects.exists()

    def test_duplicate_phone_returns_409_with_owned_friend_name(
        self, create_phone_friend: Callable[..., Friend]
    ) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        create_phone_friend(owner, BRAZILIAN_PHONE, "Marina")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.post(
            reverse("list_friends"),
            {
                "name": "Bia",
                "phone": "(11) 99999-9999",
                "cadence_amount": 1,
                "cadence_unit": "month",
            },
            format="json",
        )

        # Assert
        assert response.status_code == 409
        assert response.data["errors"][0]["attr"] == "phone"
        assert "Marina" in response.data["errors"][0]["detail"]
        assert Friend.objects.count() == 1

    def test_other_owner_phone_does_not_block_or_expose_its_friend(
        self, create_phone_friend: Callable[..., Friend]
    ) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        other_owner = User.objects.create_user(username="outro")
        create_phone_friend(other_owner, BRAZILIAN_PHONE, "Nome privado")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.post(
            reverse("list_friends"),
            {
                "name": "Bia",
                "phone": "(11) 99999-9999",
                "cadence_amount": 1,
                "cadence_unit": "month",
            },
            format="json",
        )

        # Assert
        assert response.status_code == 201
        assert response.data["name"] == "Bia"
        assert Friend.objects.filter(owner=owner, phone=BRAZILIAN_PHONE).exists()

    def test_patch_replaces_and_clears_phone(
        self, create_phone_friend: Callable[..., Friend]
    ) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        friend = create_phone_friend(owner, BRAZILIAN_PHONE)
        client = APIClient()
        client.force_authenticate(owner)
        url = reverse("get_friend", args=[friend.pk])

        # Act
        updated = client.patch(url, {"phone": "+351 912 345 678"}, format="json")
        friend.refresh_from_db()

        # Assert
        assert updated.status_code == 200
        assert friend.phone == "+351912345678"

        # Act
        cleared = client.patch(url, {"phone": None}, format="json")
        friend.refresh_from_db()

        # Assert
        assert cleared.status_code == 200
        assert friend.phone is None

    def test_patch_without_phone_preserves_existing_number(
        self, create_phone_friend: Callable[..., Friend]
    ) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        friend = create_phone_friend(owner, BRAZILIAN_PHONE)
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.patch(
            reverse("get_friend", args=[friend.pk]),
            {
                "name": "Novo nome",
            },
            format="json",
        )

        # Assert
        assert response.status_code == 200
        assert response.data["phone"] == BRAZILIAN_PHONE

    def test_patch_keeps_own_phone_without_conflict(
        self, create_phone_friend: Callable[..., Friend]
    ) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        friend = create_phone_friend(owner, BRAZILIAN_PHONE)
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.patch(
            reverse("get_friend", args=[friend.pk]),
            {
                "phone": "(11) 99999-9999",
            },
            format="json",
        )

        # Assert
        assert response.status_code == 200
        assert response.data["phone"] == BRAZILIAN_PHONE

    def test_conflicting_patch_preserves_all_existing_fields(
        self, create_phone_friend: Callable[..., Friend]
    ) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        create_phone_friend(owner, BRAZILIAN_PHONE, "Marina")
        friend = create_phone_friend(owner, "+351912345678")
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        response = client.patch(
            reverse("get_friend", args=[friend.pk]),
            {
                "name": "Nome alterado",
                "phone": "(11) 99999-9999",
            },
            format="json",
        )
        friend.refresh_from_db()

        # Assert
        assert response.status_code == 409
        assert friend.name == "Bia"
        assert friend.phone == "+351912345678"

    def test_phone_is_returned_by_list_detail_and_contact_registration(
        self, create_phone_friend: Callable[..., Friend]
    ) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        friend = create_phone_friend(owner, BRAZILIAN_PHONE)
        client = APIClient()
        client.force_authenticate(owner)

        # Act
        listed = client.get(reverse("list_friends"))
        detail = client.get(reverse("get_friend", args=[friend.pk]))
        recorded = client.post(
            reverse("record_contact", args=[friend.pk]),
            {
                "kind": "message",
                "note": "",
            },
            format="json",
        )

        # Assert
        assert listed.data[0]["phone"] == BRAZILIAN_PHONE
        assert detail.data["phone"] == BRAZILIAN_PHONE
        assert recorded.data["phone"] == BRAZILIAN_PHONE


@pytest.mark.django_db
class TestFriendPhoneStorage:
    def test_database_rejects_duplicate_phone_for_owner(
        self, create_phone_friend: Callable[..., Friend]
    ) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        create_phone_friend(owner, BRAZILIAN_PHONE)

        # Act / Assert
        with pytest.raises(IntegrityError, match=FRIEND_PHONE_UNIQUE_CONSTRAINT):
            with transaction.atomic():
                create_phone_friend(owner, BRAZILIAN_PHONE)

    def test_database_allows_multiple_friends_without_phone(
        self, create_phone_friend: Callable[..., Friend]
    ) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")

        # Act
        create_phone_friend(owner)
        create_phone_friend(owner)

        # Assert
        assert Friend.objects.filter(owner=owner, phone__isnull=True).count() == 2

    def test_admin_form_normalizes_phone_before_model_validation(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        form = FriendAdminForm(
            data={
                "owner": owner.pk,
                "name": "Bia",
                "phone": "+55 (11) 99999-9999",
                "cadence_amount": 1,
                "cadence_unit": "month",
            }
        )

        # Act
        assert form.is_valid(), form.errors
        friend = form.save()

        # Assert
        assert friend.phone == BRAZILIAN_PHONE


@pytest.mark.django_db(transaction=True)
class TestConcurrentFriendPhones:
    def test_simultaneous_creations_return_one_success_and_one_conflict(self) -> None:
        # Arrange
        owner = User.objects.create_user(username="ana")
        barrier = Barrier(2, timeout=10)

        def send_friend_for_owner() -> int:
            client = APIClient()
            client.force_authenticate(owner)
            try:
                barrier.wait()
                response = client.post(
                    reverse("list_friends"),
                    {
                        "name": "Bia",
                        "phone": BRAZILIAN_PHONE,
                        "cadence_amount": 1,
                        "cadence_unit": "month",
                    },
                    format="json",
                )
                return response.status_code
            finally:
                connections.close_all()

        # Act
        with ThreadPoolExecutor(max_workers=2) as executor:
            responses = list(executor.map(lambda _: send_friend_for_owner(), range(2)))

        # Assert
        assert sorted(responses) == [201, 409]
        assert Friend.objects.filter(owner=owner, phone=BRAZILIAN_PHONE).count() == 1


@pytest.mark.django_db(transaction=True)
class TestFriendPhoneMigration:
    def test_existing_friend_keeps_data_with_no_phone_after_migration(self) -> None:
        # Arrange
        previous_migration = [("friends", "0002_friend_birthday")]
        phone_migration = [("friends", "0003_friend_phone")]
        executor = MigrationExecutor(connection)
        latest_migrations = executor.loader.graph.leaf_nodes()
        executor.migrate(previous_migration)
        try:
            previous_apps = executor.loader.project_state(previous_migration).apps
            owner = previous_apps.get_model("auth", "User").objects.create(
                username="ana"
            )
            old_friend = previous_apps.get_model("friends", "Friend").objects.create(
                owner=owner,
                name="Bia",
                cadence_amount=2,
                cadence_unit="week",
                birthday_day=29,
                birthday_month=2,
            )

            # Act
            MigrationExecutor(connection).migrate(phone_migration)
            friend = Friend.objects.get(pk=old_friend.pk)

            # Assert
            assert friend.phone is None
            assert friend.name == "Bia"
            assert friend.owner_id == owner.pk
            assert friend.cadence_amount == 2
            assert friend.birthday_day == 29
            assert friend.birthday_month == 2
        finally:
            MigrationExecutor(connection).migrate(latest_migrations)
