"""Calculate cadence in days from a friend's contact rhythm."""

from typing import ClassVar

from apps.friends.models import Friend


class CadenceCalculator:
    """Convert a friend's cadence to days for board and sorting logic."""

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
