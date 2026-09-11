import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Numeric, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.recommendation import Recommendation


class MACCResult(Base):
    __tablename__ = "macc_results"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    recommendation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("recommendations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    cost_capex_inr: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    annual_saving_inr: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    tCO2e_reduced_annual: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    cost_per_tco2e: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    payback_years: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)

    recommendation: Mapped["Recommendation"] = relationship(
        "Recommendation", back_populates="macc_results"
    )
