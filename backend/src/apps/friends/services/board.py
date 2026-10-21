"""Calculate a friend's board column from their desired contact rhythm."""

from datetime import datetime
from typing import ClassVar

from django.db import models
from django.utils import timezone

from apps.friends.models import Friend


class Column(models.TextChoices):
    """Board column shown for a friend, calculated without storing it."""

    JUST_TALKED = "just_talked", "Falei agora"
    OVERDUE = "overdue", "Faz um tempinho"
    THIS_WEEK = "this_week", "Essa semana"
    ON_TRACK = "on_track", "Em dia"


class BoardService:
    """Select a board column using local calendar days and a fixed seven-day window."""

    DAYS_JUST_TALKED: ClassVar[int] = 1
    DAYS_THIS_WEEK: ClassVar[int] = 7
    DAYS_PER_UNIT: ClassVar[dict[str, int]] = {
        Friend.CadenceUnit.DAY: 1,
        Friend.CadenceUnit.WEEK: 7,
        Friend.CadenceUnit.MONTH: 30,
        Friend.CadenceUnit.YEAR: 365,
    }

    @classmethod
    def get_cadence_in_days(cls, friend: Friend) -> int:
        """Return the friend's cadence converted to days."""
        return friend.cadence_amount * cls.DAYS_PER_UNIT[friend.cadence_unit]

    @classmethod
    def get_days_since_contact(cls, last_contact: datetime) -> int:
        """Return the number of days since the last contact in the active time zone."""
        return (timezone.localdate() - timezone.localdate(last_contact)).days

    def calculate_column(self, friend: Friend, last_contact: datetime | None) -> Column:
        """Return the friend's column from the supplied last contact, without a query.

        Calendar dates use Django's active time zone, configured as São Paulo.
        A contact today or yesterday takes precedence over an expired rhythm.
        """
        if last_contact is None:
            return Column.OVERDUE

        days_since_last_contact = self.get_days_since_contact(last_contact)
        if days_since_last_contact <= self.DAYS_JUST_TALKED:
            return Column.JUST_TALKED

        cadence_in_days = self.get_cadence_in_days(friend)
        days_until_next_contact = cadence_in_days - days_since_last_contact
        if days_until_next_contact <= 0:
            return Column.OVERDUE
        if days_until_next_contact <= self.DAYS_THIS_WEEK:
            return Column.THIS_WEEK
        return Column.ON_TRACK
