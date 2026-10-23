from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.app.auth_dependencies import require_admin
from backend.app.dependencies import get_db
from backend.app.models.contract import Contract
from backend.app.models.user import User
from backend.app.schemas.checkout_settlement import (
    CheckoutDepositApplyRequest,
    CheckoutPrepareRequest,
    CheckoutRequest,
    CheckoutSnapshot,
)
from backend.app.services import checkout_settlement as service
from backend.app.api.deposits import get_deposit_values

router = APIRouter(prefix="/contracts", tags=["Checkout settlement"], dependencies=[Depends(require_admin)])
DB = Annotated[Session, Depends(get_db)]
Admin = Annotated[User, Depends(require_admin)]


@router.get("/{contract_id}/checkout-settlement")
def get_settlement(contract_id: int, db: DB):
    if db.get(Contract, contract_id) is None:
        raise HTTPException(404, "Contract not found")
    saved = service.get_existing(db, contract_id)
    return service.snapshot_values(saved) if saved else None


@router.get("/{contract_id}/checkout-context")
def get_context(contract_id: int, checkout_date: date, db: DB):
    contract = db.get(Contract, contract_id)
    if contract is None:
        raise HTTPException(404, "Contract not found")
    if not 2020 <= checkout_date.year <= 2100:
        raise HTTPException(400, "Invalid checkout year")
    contract, contracts, invoices, meters, fee, target = service.load_context(
        db, contract_id, contract.room_id, checkout_date)
    collected, refunded, deducted, forfeited, balance = get_deposit_values(contract.id, db)
    return dict(
        invoice_id=target.id if target else None,
        invoice_status=target.status if target else None,
        invoice_version=target.version if target else None,
        total_paid=sum(p.amount for p in target.payments) if target else 0,
        suggested_checkout_type=(
            "EARLY"
            if contract.end_date and checkout_date < contract.end_date
            else "ON_TIME"
        ),
        monthly_rent=contract.monthly_rent,
        rent_cycle=contract.rent_billing_cycle_months,
        rent_anchor_year=contract.rent_billing_anchor_year,
        rent_anchor_month=contract.rent_billing_anchor_month,
        rent_history=[dict(id=i.id, year=i.year, month=i.month, version=i.version, status=i.status,
                           amount=sum(it.amount for it in i.items if it.item_type == "RENT"),
                           description="; ".join(it.description for it in i.items if it.item_type == "RENT"))
                      for i in invoices if i.status != "CANCELLED"
                      and (contract.start_date.year, contract.start_date.month) <= (i.year, i.month) <= (checkout_date.year, checkout_date.month)
                      and any(it.item_type == "RENT" for it in i.items)],
        deposit=dict(required_amount=contract.deposit_required, total_collected=collected,
                     total_refunded=refunded, total_deducted=deducted,
                     total_forfeited=forfeited, current_balance=balance),
        electricity_rate=fee.electricity_rate, water_fee=fee.water_fee, management_fee=fee.management_fee,
    )


@router.post("/{contract_id}/checkout-preview")
def preview_settlement(contract_id: int, data: CheckoutRequest, db: DB):
    # POST only carries the preview inputs; no writes, audit entries or commit.
    return service.preview(db, contract_id, data)


@router.post("/{contract_id}/checkout-prepare", response_model=CheckoutSnapshot)
def prepare_settlement(contract_id: int, data: CheckoutPrepareRequest, request: Request, db: DB, user: Admin):
    return service.prepare(db, contract_id, data, user, request)


@router.post(
    "/{contract_id}/checkout-apply-deposit",
    response_model=CheckoutSnapshot,
)
def apply_checkout_deposit(
    contract_id: int,
    data: CheckoutDepositApplyRequest,
    request: Request,
    db: DB,
    user: Admin,
):
    return service.apply_deposit_plan(
        db,
        contract_id,
        data,
        user,
        request,
    )
