"""Tests for the board column calculated from a friend's contact rhythm."""

from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import pytest
import time_machine
from django.utils import timezone

from apps.friends.models import Friend
from apps.friends.services.board import BoardService, Column


@pytest.fixture(autouse=True)
def freeze_clock() -> Iterator[None]:
    """Keep each board test at Thursday 10:00 in São Paulo."""
    with time_machine.travel(datetime(2026, 10, 22, 13, tzinfo=UTC), tick=False):
        yield


class TestBoardService:
    def test_friend_with_no_contact_is_overdue(self) -> None:
        # Arrange
        friend = Friend(cadence_amount=1, cadence_unit=Friend.CadenceUnit.MONTH)

        # Act
        column = BoardService().calculate_column(friend, None)

        # Assert
        assert column == Column.OVERDUE

    @pytest.mark.parametrize("days_since_contact", [0, 1])
    def test_contact_today_or_yesterday_is_just_talked(
        self, days_since_contact: int
    ) -> None:
        # Arrange
        friend = Friend(cadence_amount=1, cadence_unit=Friend.CadenceUnit.DAY)
        last_contact = timezone.now() - timedelta(days=days_since_contact)

        # Act
        column = BoardService().calculate_column(friend, last_contact)

        # Assert
        assert column == Column.JUST_TALKED

    @pytest.mark.parametrize("days_since_contact", [2, 22])
    def test_monthly_cadence_with_more_than_seven_days_left_is_on_track(
        self, days_since_contact: int
    ) -> None:
        # Arrange
        friend = Friend(cadence_amount=1, cadence_unit=Friend.CadenceUnit.MONTH)
        last_contact = timezone.now() - timedelta(days=days_since_contact)

        # Act
        column = BoardService().calculate_column(friend, last_contact)

        # Assert
        assert column == Column.ON_TRACK

    def test_monthly_cadence_with_seven_days_left_is_this_week(self) -> None:
        # Arrange
        friend = Friend(cadence_amount=1, cadence_unit=Friend.CadenceUnit.MONTH)
        last_contact = timezone.now() - timedelta(days=23)

        # Act
        column = BoardService().calculate_column(friend, last_contact)

        # Assert
        assert column == Column.THIS_WEEK

    def test_expired_monthly_cadence_is_overdue(self) -> None:
        # Arrange
        friend = Friend(cadence_amount=1, cadence_unit=Friend.CadenceUnit.MONTH)
        last_contact = timezone.now() - timedelta(days=30)

        # Act
        column = BoardService().calculate_column(friend, last_contact)

        # Assert
        assert column == Column.OVERDUE

    def test_weekly_cadence_with_two_day_contact_is_this_week(self) -> None:
        # Arrange
        friend = Friend(cadence_amount=1, cadence_unit=Friend.CadenceUnit.WEEK)
        last_contact = timezone.now() - timedelta(days=2)

        # Act
        column = BoardService().calculate_column(friend, last_contact)

        # Assert
        assert column == Column.THIS_WEEK

    def test_two_weeks_with_eight_days_since_contact_is_this_week(self) -> None:
        # Arrange
        friend = Friend(cadence_amount=2, cadence_unit=Friend.CadenceUnit.WEEK)
        last_contact = timezone.now() - timedelta(days=8)

        # Act
        column = BoardService().calculate_column(friend, last_contact)

        # Assert
        assert column == Column.THIS_WEEK

    def test_yearly_cadence_with_358_days_since_contact_is_this_week(self) -> None:
        # Arrange
        friend = Friend(cadence_amount=1, cadence_unit=Friend.CadenceUnit.YEAR)
        last_contact = timezone.now() - timedelta(days=358)

        # Act
        column = BoardService().calculate_column(friend, last_contact)

        # Assert
        assert column == Column.THIS_WEEK

    def test_tuesday_night_contact_counts_as_tuesday_in_sao_paulo(self) -> None:
        # Arrange
        friend = Friend(cadence_amount=1, cadence_unit=Friend.CadenceUnit.MONTH)
        last_contact = datetime(2026, 10, 21, 2, 30, tzinfo=UTC)

        # Act
        column = BoardService().calculate_column(friend, last_contact)

        # Assert
        assert column == Column.ON_TRACK
