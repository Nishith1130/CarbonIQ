import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Organization, Run, User


def test_tenant_isolation_via_org_id(db_session: Session):
    # Tenant A
    user_a = User(email="tenant_a@sme.com", password_hash="hash_a")
    db_session.add(user_a)
    db_session.commit()

    org_a = Organization(
        owner_user_id=user_a.id,
        name="Tenant A Textiles",
        sector_id="textile_dyeing",
        turnover_inr=Decimal("10000000.00"),
    )
    db_session.add(org_a)
    db_session.commit()

    run_a = Run(org_id=org_a.id, ef_version="cea_v20.0_ipcc_ar6")
    db_session.add(run_a)
    db_session.commit()

    # Tenant B
    user_b = User(email="tenant_b@sme.com", password_hash="hash_b")
    db_session.add(user_b)
    db_session.commit()

    org_b = Organization(
        owner_user_id=user_b.id,
        name="Tenant B Foundry",
        sector_id="foundry",
        turnover_inr=Decimal("20000000.00"),
    )
    db_session.add(org_b)
    db_session.commit()

    run_b = Run(org_id=org_b.id, ef_version="cea_v20.0_ipcc_ar6")
    db_session.add(run_b)
    db_session.commit()

    # 1. Tenant A querying with their org_id should retrieve run_a
    stmt_a = select(Run).where(Run.id == run_a.id, Run.org_id == org_a.id)
    assert db_session.scalar(stmt_a) is not None

    # 2. Tenant B attempting to read run_a using their own org_id MUST return None
    stmt_cross = select(Run).where(Run.id == run_a.id, Run.org_id == org_b.id)
    assert db_session.scalar(stmt_cross) is None

    # 3. Arbitrary non-existent run ID returns None
    fake_run_id = uuid.uuid4()
    stmt_fake = select(Run).where(Run.id == fake_run_id, Run.org_id == org_a.id)
    assert db_session.scalar(stmt_fake) is None
