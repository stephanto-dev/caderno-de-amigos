import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, connection, transaction
from django.db.migrations.executor import MigrationExecutor
from django.utils import timezone

from apps.friends.models import Contact, Friend, Group


@pytest.mark.django_db
class TestFriend:
    def test_friend_accepts_two_groups_and_contact_cadence(self) -> None:
        # Arrange
        owner = get_user_model().objects.create_user(username="ana")
        family = Group.objects.create(
            owner=owner, name="Família", color=Group.Color.FAMILY
        )
        college = Group.objects.create(
            owner=owner, name="Faculdade", color=Group.Color.COLLEGE
        )

        # Act
        friend = Friend.objects.create(
            owner=owner,
            name="Bia",
            cadence_amount=2,
            cadence_unit=Friend.CadenceUnit.WEEK,
        )
        friend.groups.add(family, college)

        # Assert
        assert set(friend.groups.all()) == {family, college}
        assert friend.cadence_amount == 2
        assert friend.cadence_unit == Friend.CadenceUnit.WEEK

    def test_friend_rejects_zero_cadence_amount_on_full_clean(self) -> None:
        # Arrange
        owner = get_user_model().objects.create_user(username="ana")
        friend = Friend(
            owner=owner,
            name="Bia",
            cadence_amount=0,
            cadence_unit=Friend.CadenceUnit.DAY,
        )

        # Act / Assert
        with pytest.raises(ValidationError) as error:
            friend.full_clean()
        assert "cadence_amount" in error.value.message_dict

    def test_friend_rejects_zero_cadence_amount_on_save_via_database_constraint(
        self,
    ) -> None:
        # Arrange
        from django.db import IntegrityError

        owner = get_user_model().objects.create_user(username="ana")
        friend = Friend(
            owner=owner,
            name="Bia",
            cadence_amount=0,
            cadence_unit=Friend.CadenceUnit.DAY,
        )

        # Act / Assert
        with pytest.raises(IntegrityError) as error:
            friend.save()
        assert "friend_cadence_amount_gte_1" in str(error.value)


@pytest.mark.django_db
class TestFriendBirthday:
    @pytest.mark.parametrize(
        "birthday_day,birthday_month",
        [(29, 2), (30, 4), (31, 1), (31, 12), (None, None)],
    )
    def test_friend_accepts_valid_birthday_on_save(
        self, birthday_day: int | None, birthday_month: int | None
    ) -> None:
        # Arrange
        owner = get_user_model().objects.create_user(username="ana")

        # Act
        friend = Friend.objects.create(
            owner=owner,
            name="Bia",
            cadence_amount=1,
            cadence_unit=Friend.CadenceUnit.MONTH,
            birthday_day=birthday_day,
            birthday_month=birthday_month,
        )
        friend.refresh_from_db()

        # Assert
        assert friend.birthday_day == birthday_day
        assert friend.birthday_month == birthday_month

    @pytest.mark.parametrize("birthday_day,birthday_month", [(1, None), (None, 1)])
    def test_friend_rejects_incomplete_birthday_on_save(
        self, birthday_day: int | None, birthday_month: int | None
    ) -> None:
        # Arrange
        owner = get_user_model().objects.create_user(username="ana")
        friend = Friend(
            owner=owner,
            name="Bia",
            cadence_amount=1,
            cadence_unit=Friend.CadenceUnit.MONTH,
            birthday_day=birthday_day,
            birthday_month=birthday_month,
        )

        # Act / Assert
        with pytest.raises(IntegrityError, match="friend_birthday_fields_together"):
            with transaction.atomic():
                friend.save()

    @pytest.mark.parametrize(
        "birthday_day,birthday_month",
        [(31, 4), (30, 2), (0, 1), (32, 1), (1, 0), (1, 13)],
    )
    def test_friend_rejects_invalid_birthday_on_save(
        self, birthday_day: int, birthday_month: int
    ) -> None:
        # Arrange
        owner = get_user_model().objects.create_user(username="ana")
        friend = Friend(
            owner=owner,
            name="Bia",
            cadence_amount=1,
            cadence_unit=Friend.CadenceUnit.MONTH,
            birthday_day=birthday_day,
            birthday_month=birthday_month,
        )

        # Act / Assert
        with pytest.raises(IntegrityError, match="friend_birthday_valid_date"):
            with transaction.atomic():
                friend.save()

    def test_friend_rejects_invalid_birthday_on_full_clean(self) -> None:
        # Arrange
        owner = get_user_model().objects.create_user(username="ana")
        friend = Friend(
            owner=owner,
            name="Bia",
            cadence_amount=1,
            cadence_unit=Friend.CadenceUnit.MONTH,
            birthday_day=31,
            birthday_month=4,
        )

        # Act / Assert
        with pytest.raises(ValidationError):
            friend.full_clean()


@pytest.mark.django_db(transaction=True)
class TestFriendBirthdayMigration:
    def test_existing_friend_keeps_data_and_has_no_birthday_after_migration(
        self,
    ) -> None:
        # Arrange
        previous_migration = [("friends", "0001_initial")]
        birthday_migration = [("friends", "0002_friend_birthday")]
        executor = MigrationExecutor(connection)
        executor.migrate(previous_migration)
        try:
            previous_apps = executor.loader.project_state(previous_migration).apps
            previous_user = previous_apps.get_model("auth", "User")
            previous_friend = previous_apps.get_model("friends", "Friend")
            owner = previous_user.objects.create(username="ana")
            friend = previous_friend.objects.create(
                owner=owner,
                name="Bia",
                cadence_amount=2,
                cadence_unit="week",
            )

            # Act
            executor = MigrationExecutor(connection)
            executor.migrate(birthday_migration)
            migrated_friend = Friend.objects.get(pk=friend.pk)

            # Assert
            assert migrated_friend.owner_id == owner.pk
            assert migrated_friend.name == "Bia"
            assert migrated_friend.cadence_amount == 2
            assert migrated_friend.cadence_unit == Friend.CadenceUnit.WEEK
            assert migrated_friend.birthday_day is None
            assert migrated_friend.birthday_month is None
        finally:
            # Restore the schema even if an assertion fails, for the next tests.
            MigrationExecutor(connection).migrate(birthday_migration)


@pytest.mark.django_db
class TestGroup:
    def test_group_rejects_name_with_different_case_for_same_owner(self) -> None:
        # Arrange
        owner = get_user_model().objects.create_user(username="ana")
        Group.objects.create(owner=owner, name="Família", color=Group.Color.FAMILY)

        # Act / Assert
        with pytest.raises(IntegrityError), transaction.atomic():
            Group.objects.create(owner=owner, name="família", color=Group.Color.NEUTRAL)

    def test_group_rejects_duplicate_name_for_same_owner(self) -> None:
        # Arrange
        owner = get_user_model().objects.create_user(username="ana")
        Group.objects.create(owner=owner, name="Família", color=Group.Color.FAMILY)
        group = Group(owner=owner, name="Família", color=Group.Color.NEUTRAL)

        # Act / Assert
        with pytest.raises(ValidationError):
            group.full_clean()

    def test_group_accepts_same_name_for_another_owner(self) -> None:
        # Arrange
        first_owner = get_user_model().objects.create_user(username="ana")
        second_owner = get_user_model().objects.create_user(username="bia")
        Group.objects.create(
            owner=first_owner, name="Família", color=Group.Color.FAMILY
        )

        # Act
        group = Group.objects.create(
            owner=second_owner, name="família", color=Group.Color.FAMILY
        )

        # Assert
        assert Group.objects.filter(name__iexact="Família").count() == 2
        assert group.owner == second_owner


@pytest.mark.django_db
class TestContact:
    def test_contact_is_deleted_with_friend(self) -> None:
        # Arrange
        owner = get_user_model().objects.create_user(username="ana")
        friend = Friend.objects.create(
            owner=owner,
            name="Bia",
            cadence_amount=1,
            cadence_unit=Friend.CadenceUnit.MONTH,
        )
        Contact.objects.create(friend=friend, kind=Contact.Kind.MESSAGE)

        # Act
        friend.delete()

        # Assert
        assert not Contact.objects.exists()

    def test_contact_default_date_is_timezone_aware_after_save(self) -> None:
        # Arrange
        owner = get_user_model().objects.create_user(username="ana")
        friend = Friend.objects.create(
            owner=owner,
            name="Bia",
            cadence_amount=1,
            cadence_unit=Friend.CadenceUnit.YEAR,
        )

        # Act
        contact = Contact.objects.create(friend=friend, kind=Contact.Kind.CALL)
        contact.refresh_from_db()

        # Assert
        assert timezone.is_aware(contact.date)
