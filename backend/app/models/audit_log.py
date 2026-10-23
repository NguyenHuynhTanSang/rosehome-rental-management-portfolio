from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    JSON,
    String,
    Text,
    func,
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from backend.app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    __table_args__ = (

        Index(
            "ix_audit_logs_created_at",
            "created_at",
        ),

        Index(
            "ix_audit_logs_action",
            "action",
        ),

    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
    )

    # =====================================================
    # USER
    #
    # Nullable để lịch sử vẫn còn
    # ngay cả khi sau này user bị xóa.
    # =====================================================

    user_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    # Snapshot email tại thời điểm thao tác.
    actor_email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    # =====================================================
    # ACTION
    #
    # Ví dụ:
    # CREATE_PAYMENT
    # ISSUE_INVOICE
    # END_CONTRACT
    # COLLECT_DEPOSIT
    # =====================================================

    action: Mapped[str] = mapped_column(
        String(80),
        nullable=False,
    )

    # =====================================================
    # TARGET
    # =====================================================

    entity_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    entity_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    # =====================================================
    # HUMAN READABLE DESCRIPTION
    # =====================================================

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # =====================================================
    # STRUCTURED DETAILS
    #
    # Không lưu:
    # - password
    # - JWT
    # - API key
    # - CCCD đầy đủ
    # =====================================================

    details: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    # =====================================================
    # REQUEST INFO
    # =====================================================

    ip_address: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )