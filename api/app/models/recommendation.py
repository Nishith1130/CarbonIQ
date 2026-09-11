import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.hotspot import Hotspot
    from app.models.macc_result import MACCResult
    from app.models.run import Run


class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    run_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    hotspot_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("hotspots.id", ondelete="CASCADE"), nullable=False, index=True
    )
    intervention_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    source_citation: Mapped[str] = mapped_column(String(255), nullable=False)

    run: Mapped["Run"] = relationship("Run", back_populates="recommendations")
    hotspot: Mapped["Hotspot"] = relationship("Hotspot", back_populates="recommendations")
    macc_results: Mapped[list["MACCResult"]] = relationship(
        "MACCResult", back_populates="recommendation", cascade="all, delete-orphan"
    )
