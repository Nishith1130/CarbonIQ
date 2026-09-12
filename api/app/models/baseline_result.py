import uuid
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, ForeignKey, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.activity_data import ActivityData
    from app.models.run import Run


class BaselineResult(Base):
    __tablename__ = "baseline_results"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    run_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    unit_process: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    scope: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # '1', '2', '3_partial'
    tCO2e: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    activity_data_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("activity_data.id", ondelete="SET NULL"), nullable=True, index=True
    )
    emission_factor_ref: Mapped[str] = mapped_column(String(255), nullable=False)
    is_estimated: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    data_source: Mapped[str] = mapped_column(String(50), default="measured", server_default="measured", nullable=False)

    run: Mapped["Run"] = relationship("Run", back_populates="baseline_results")
    activity_data: Mapped[Optional["ActivityData"]] = relationship(
        "ActivityData", back_populates="baseline_results"
    )
