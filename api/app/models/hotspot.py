import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.recommendation import Recommendation
    from app.models.run import Run


class Hotspot(Base):
    __tablename__ = "hotspots"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    run_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    rank: Mapped[int] = mapped_column(Integer, nullable=False)  # 1, 2, 3
    unit_process: Mapped[str] = mapped_column(String(100), nullable=False)
    tCO2e: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    share_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    is_estimated: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    data_source: Mapped[str] = mapped_column(String(50), default="measured", server_default="measured", nullable=False)

    run: Mapped["Run"] = relationship("Run", back_populates="hotspots")
    recommendations: Mapped[list["Recommendation"]] = relationship(
        "Recommendation", back_populates="hotspot", cascade="all, delete-orphan"
    )
