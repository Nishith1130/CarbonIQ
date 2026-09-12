"""Resize intervention_embeddings.vector from 768 to 3072 dims (gemini-embedding-001)

Revision ID: 0002_resize_embedding_vector
Revises: 0001_initial_schema
Create Date: 2026-09-12 22:20:00.000000

"""
from collections.abc import Sequence

from alembic import op
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision: str = "0002_resize_embedding_vector"
down_revision: str | None = "a57ab300b4a7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Drop old 768-dim column and recreate as 3072-dim.
    # We use ALTER COLUMN … TYPE which pgvector supports directly.
    op.execute(
        "ALTER TABLE intervention_embeddings "
        "ALTER COLUMN vector TYPE vector(3072) "
        "USING vector::vector(3072);"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE intervention_embeddings "
        "ALTER COLUMN vector TYPE vector(768) "
        "USING vector::vector(768);"
    )
