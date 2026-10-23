from pathlib import Path


ROOT = (
    Path(__file__)
    .resolve()
    .parents[2]
)


def read(
    path: str,
) -> str:
    return (
        ROOT
        .joinpath(path)
        .read_text(
            encoding="utf-8"
        )
    )


def test_payment_void_backend_guards():
    source = read(
        "backend/app/api/payments.py"
    )

    assert (
        '"/{invoice_id}/payments/{payment_id}/void"'
        in source
    )

    assert (
        "Depends(require_admin)"
        in source
    )

    assert (
        "assert_invoice_not_frozen("
        in source
    )

    assert (
        'payment.payment_method == "DEPOSIT"'
        in source
    )

    assert (
        "CheckoutSettlement.deposit_payment_id"
        in source
    )

    assert (
        "Delete the payment receipt"
        in source
    )

    assert (
        '"VOID_PAYMENT"'
        in source
    )

    assert (
        "db.delete("
        in source
    )


def test_payment_void_ui():
    source = read(
        "frontend/src/pages/InvoiceDetails.tsx"
    )

    assert (
        "async function handleVoidPayment("
        in source
    )

    assert (
        "PaymentVoidResponse,"
        in source
    )

    assert (
        "PaymentVoidPayload"
        in source
    )

    assert (
        "/void`"
        in source
    )

    assert (
        'payment.payment_method !== "DEPOSIT"'
        in source
    )

    button_token = (
        '"H\\u1ee7y ghi nh\\u1eadn"'
    )

    button_positions = []

    cursor = 0

    while True:
        pos = source.find(
            button_token,
            cursor,
        )

        if pos < 0:
            break

        button_positions.append(
            pos
        )

        cursor = (
            pos
            +
            len(button_token)
        )

    assert len(
        button_positions
    ) == 2

    map_token = "payments.map("

    first_map = source.find(
        map_token
    )

    second_map = source.find(
        map_token,
        first_map + 1,
    )

    assert first_map >= 0
    assert second_map > first_map

    # Mobile button must be inside first payment map.
    assert (
        first_map
        <
        button_positions[0]
        <
        second_map
    )

    # Desktop button must be after second payment map.
    assert (
        button_positions[1]
        >
        second_map
    )

    # Neither payment-row action may leak into MODALS.
    modal_marker = (
        "MODALS"
    )

    modal_position = source.find(
        modal_marker,
        second_map,
    )

    if modal_position >= 0:
        assert (
            button_positions[1]
            <
            modal_position
        )

    assert (
        "result.payment_status"
        in source
    )
