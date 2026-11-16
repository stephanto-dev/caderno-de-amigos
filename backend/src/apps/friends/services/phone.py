"""Normalize personal phone numbers without contacting an external service."""

import re

import phonenumbers


class PhoneService:
    """Convert phone input to E.164, the international +country-and-number format.

    Numbers without an explicit country use Brazil. International country codes
    are preserved, and extensions are rejected because a friend stores one number.
    The library uses bundled numbering metadata; it never queries the phone owner.
    """

    DEFAULT_REGION = "BR"
    MAX_INPUT_LENGTH = 64
    INVALID_PHONE_MESSAGE = (
        "Esse telefone não é válido. Informe DDD e número, ou apague o campo. "
        "Para outro país, inclua o código com +."
    )
    INPUT_PATTERN = re.compile(r"\+?[0-9()\s.-]+")

    def get_normalized_phone_for_friend(self, value: str | None) -> str | None:
        """Return E.164 or None for empty input; raise ValueError for invalid input."""
        if value is None or not value.strip():
            return None
        value = value.strip()
        if len(value) > self.MAX_INPUT_LENGTH or not self.INPUT_PATTERN.fullmatch(
            value
        ):
            raise ValueError(self.INVALID_PHONE_MESSAGE)
        try:
            number = phonenumbers.parse(value, self.DEFAULT_REGION)
        except phonenumbers.NumberParseException as error:
            raise ValueError(self.INVALID_PHONE_MESSAGE) from error
        if number.extension or not phonenumbers.is_valid_number(number):
            raise ValueError(self.INVALID_PHONE_MESSAGE)
        return phonenumbers.format_number(number, phonenumbers.PhoneNumberFormat.E164)
