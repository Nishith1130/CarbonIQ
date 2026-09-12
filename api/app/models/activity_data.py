import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.baseline_result import BaselineResult
    from app.models.run import Run


class ActivityData(Base):
    __tablename__ = "activity_data"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    run_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    activity_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(15, 4), nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)
    unit_process: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    month: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_estimated: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    data_source: Mapped[str] = mapped_column(String(50), default="measured", server_default="measured", nullable=False)

    run: Mapped["Run"] = relationship("Run", back_populates="activity_data")
    baseline_results: Mapped[list["BaselineResult"]] = relationship(
        "BaselineResult", back_populates="activity_data"
    )
