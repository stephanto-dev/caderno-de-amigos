import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
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
