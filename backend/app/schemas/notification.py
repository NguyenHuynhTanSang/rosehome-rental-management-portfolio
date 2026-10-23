from datetime import date, datetime

from pydantic import BaseModel


class NotificationRead(BaseModel):
    id: int
    notification_type: str

    contract_id: int
    room_id: int
    room_code: str

    reminder_stage: str
    contract_end_date: date
    days_remaining: int

    title: str
    message: str

    is_read: bool
    created_at: datetime


class NotificationUnreadCount(BaseModel):
    unread_count: int


class NotificationReadResult(BaseModel):
    message: str
    notification_id: int


class NotificationReadAllResult(BaseModel):
    message: str
    updated_count: int


class NotificationSyncResult(BaseModel):
    created_count: int
    marked_stale_as_read: int