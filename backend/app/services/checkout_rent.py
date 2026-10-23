"""Checkout-only prorating; monthly invoice billing stays unchanged."""
from calendar import monthrange
from datetime import date
from decimal import Decimal, ROUND_HALF_UP


def prorated_rent(monthly_rent: int, start: date, end: date) -> int:
    """Both endpoints count; round half up to the nearest VND."""
    if end < start or (start.year, start.month) != (end.year, end.month):
        raise ValueError("Prorated dates must be ordered within one calendar month")
    return int((Decimal(monthly_rent) * ((end - start).days + 1) / monthrange(start.year, start.month)[1])
               .quantize(Decimal("1"), rounding=ROUND_HALF_UP))
