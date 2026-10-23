from pydantic import BaseModel


class DebtItemResponse(BaseModel):
    invoice_id: int

    room_id: int
    room_code: str

    year: int
    month: int

    invoice_total: int
    total_paid: int
    remaining_amount: int

    payment_status: str


class DebtSummaryResponse(BaseModel):
    total_debt: int
    debt_invoice_count: int

    items: list[DebtItemResponse]



class MonthlyProgressStepResponse(BaseModel):
    completed: int
    total: int
    percentage: int


class MonthlyProgressResponse(BaseModel):
    year: int
    month: int

    target_room_count: int

    meter_readings: MonthlyProgressStepResponse
    invoices_created: MonthlyProgressStepResponse
    invoices_issued: MonthlyProgressStepResponse
    invoices_paid: MonthlyProgressStepResponse