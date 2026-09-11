import uuid
from datetime import UTC, date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.activity_data import ActivityData
    from app.models.baseline_result import BaselineResult
    from app.models.hotspot import Hotspot
    from app.models.organization import Organization
    from app.models.recommendation import Recommendation
    from app.models.report import Report


class Run(Base):
    __tablename__ = "runs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    period_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    period_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    ef_version: Mapped[str] = mapped_column(String(100), nullable=False, default="cea_v20.0_ipcc_ar6")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    organization: Mapped["Organization"] = relationship("Organization", back_populates="runs")
    activity_data: Mapped[list["ActivityData"]] = relationship(
        "ActivityData", back_populates="run", cascade="all, delete-orphan"
    )
    baseline_results: Mapped[list["BaselineResult"]] = relationship(
        "BaselineResult", back_populates="run", cascade="all, delete-orphan"
    )
    hotspots: Mapped[list["Hotspot"]] = relationship(
        "Hotspot", back_populates="run", cascade="all, delete-orphan"
    )
    recommendations: Mapped[list["Recommendation"]] = relationship(
        "Recommendation", back_populates="run", cascade="all, delete-orphan"
    )
    reports: Mapped[list["Report"]] = relationship(
        "Report", back_populates="run", cascade="all, delete-orphan"
    )
