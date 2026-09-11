import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.run import Run
    from app.models.user import User


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sector_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    turnover_inr: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    export_markets: Mapped[Any | None] = mapped_column(JSONB, nullable=True, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    owner: Mapped["User"] = relationship("User", back_populates="organizations")
    runs: Mapped[list["Run"]] = relationship(
        "Run", back_populates="organization", cascade="all, delete-orphan"
    )
