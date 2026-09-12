import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class InterventionEmbedding(Base):
    __tablename__ = "intervention_embeddings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    intervention_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    sector_id: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    applicable_process: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    vector: Mapped[list[float] | None] = mapped_column(Vector(768), nullable=True)
