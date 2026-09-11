"""Initial schema with pgvector and all 10 tables

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-09-12 03:54:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # 2. Table: users
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    # 3. Table: organizations
    op.create_table(
        "organizations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_user_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("sector_id", sa.String(length=100), nullable=False),
        sa.Column("turnover_inr", sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column("export_markets", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_organizations_owner_user_id"), "organizations", ["owner_user_id"], unique=False)
    op.create_index(op.f("ix_organizations_sector_id"), "organizations", ["sector_id"], unique=False)

    # 4. Table: runs
    op.create_table(
        "runs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("org_id", sa.Uuid(), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=True),
        sa.Column("period_end", sa.Date(), nullable=True),
        sa.Column("ef_version", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_runs_org_id"), "runs", ["org_id"], unique=False)

    # 5. Table: activity_data
    op.create_table(
        "activity_data",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("run_id", sa.Uuid(), nullable=False),
        sa.Column("activity_type", sa.String(length=100), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=15, scale=4), nullable=False),
        sa.Column("unit", sa.String(length=50), nullable=False),
        sa.Column("unit_process", sa.String(length=100), nullable=False),
        sa.Column("month", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["run_id"], ["runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_activity_data_run_id"), "activity_data", ["run_id"], unique=False)
    op.create_index(op.f("ix_activity_data_activity_type"), "activity_data", ["activity_type"], unique=False)
    op.create_index(op.f("ix_activity_data_unit_process"), "activity_data", ["unit_process"], unique=False)

    # 6. Table: baseline_results
    op.create_table(
        "baseline_results",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("run_id", sa.Uuid(), nullable=False),
        sa.Column("unit_process", sa.String(length=100), nullable=False),
        sa.Column("scope", sa.String(length=20), nullable=False),
        sa.Column("tCO2e", sa.Numeric(precision=12, scale=4), nullable=False),
        sa.Column("activity_data_id", sa.Uuid(), nullable=True),
        sa.Column("emission_factor_ref", sa.String(length=255), nullable=False),
        sa.ForeignKeyConstraint(["activity_data_id"], ["activity_data.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["run_id"], ["runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_baseline_results_run_id"), "baseline_results", ["run_id"], unique=False)
    op.create_index(op.f("ix_baseline_results_scope"), "baseline_results", ["scope"], unique=False)
    op.create_index(op.f("ix_baseline_results_unit_process"), "baseline_results", ["unit_process"], unique=False)
    op.create_index(op.f("ix_baseline_results_activity_data_id"), "baseline_results", ["activity_data_id"], unique=False)

    # 7. Table: hotspots
    op.create_table(
        "hotspots",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("run_id", sa.Uuid(), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False),
        sa.Column("unit_process", sa.String(length=100), nullable=False),
        sa.Column("tCO2e", sa.Numeric(precision=12, scale=4), nullable=False),
        sa.Column("share_pct", sa.Numeric(precision=5, scale=2), nullable=False),
        sa.ForeignKeyConstraint(["run_id"], ["runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_hotspots_run_id"), "hotspots", ["run_id"], unique=False)

    # 8. Table: recommendations
    op.create_table(
        "recommendations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("run_id", sa.Uuid(), nullable=False),
        sa.Column("hotspot_id", sa.Uuid(), nullable=False),
        sa.Column("intervention_id", sa.String(length=100), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False),
        sa.Column("rationale", sa.Text(), nullable=False),
        sa.Column("source_citation", sa.String(length=255), nullable=False),
        sa.ForeignKeyConstraint(["hotspot_id"], ["hotspots.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["run_id"], ["runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_recommendations_run_id"), "recommendations", ["run_id"], unique=False)
    op.create_index(op.f("ix_recommendations_hotspot_id"), "recommendations", ["hotspot_id"], unique=False)
    op.create_index(op.f("ix_recommendations_intervention_id"), "recommendations", ["intervention_id"], unique=False)

    # 9. Table: macc_results
    op.create_table(
        "macc_results",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("recommendation_id", sa.Uuid(), nullable=False),
        sa.Column("cost_capex_inr", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("annual_saving_inr", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("tCO2e_reduced_annual", sa.Numeric(precision=12, scale=4), nullable=False),
        sa.Column("cost_per_tco2e", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("payback_years", sa.Numeric(precision=5, scale=2), nullable=False),
        sa.ForeignKeyConstraint(["recommendation_id"], ["recommendations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_macc_results_recommendation_id"), "macc_results", ["recommendation_id"], unique=False)

    # 10. Table: reports
    op.create_table(
        "reports",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("run_id", sa.Uuid(), nullable=False),
        sa.Column("template_type", sa.String(length=50), nullable=False),
        sa.Column("file", sa.LargeBinary(), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["run_id"], ["runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_reports_run_id"), "reports", ["run_id"], unique=False)

    # 11. Table: intervention_embeddings (pgvector)
    op.create_table(
        "intervention_embeddings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("intervention_id", sa.String(length=100), nullable=False),
        sa.Column("sector_id", sa.String(length=100), nullable=False),
        sa.Column("applicable_process", sa.String(length=100), nullable=False),
        sa.Column("vector", Vector(1536), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_intervention_embeddings_intervention_id"), "intervention_embeddings", ["intervention_id"], unique=True)
    op.create_index(op.f("ix_intervention_embeddings_sector_id"), "intervention_embeddings", ["sector_id"], unique=False)
    op.create_index(op.f("ix_intervention_embeddings_applicable_process"), "intervention_embeddings", ["applicable_process"], unique=False)


def downgrade() -> None:
    op.drop_table("intervention_embeddings")
    op.drop_table("reports")
    op.drop_table("macc_results")
    op.drop_table("recommendations")
    op.drop_table("hotspots")
    op.drop_table("baseline_results")
    op.drop_table("activity_data")
    op.drop_table("runs")
    op.drop_table("organizations")
    op.drop_table("users")
    op.execute("DROP EXTENSION IF EXISTS vector;")
