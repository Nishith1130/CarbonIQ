from collections.abc import Generator

import pytest
from sqlalchemy.orm import Session

from app.db.session import SessionLocal, engine
from app.models import Organization, Run, User


@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    """Provide a transactional database session that rolls back after each test."""
    connection = engine.connect()
    transaction = connection.begin()
    session = SessionLocal(bind=connection)

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture(scope="function")
def test_user(db_session: Session) -> User:
    user = User(
        email="sme_owner@example.com",
        password_hash="$2b$12$dummyhashforunittests000000000000000000000000000000000",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def test_org(db_session: Session, test_user: User) -> Organization:
    org = Organization(
        owner_user_id=test_user.id,
        name="Surat EcoTex Dyeing Ltd",
        sector_id="textile_dyeing",
        turnover_inr=180000000.00,
        export_markets=["EU", "US"],
    )
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    return org


@pytest.fixture(scope="function")
def test_run(db_session: Session, test_org: Organization) -> Run:
    run = Run(
        org_id=test_org.id,
        ef_version="cea_v20.0_ipcc_ar6",
    )
    db_session.add(run)
    db_session.commit()
    db_session.refresh(run)
    return run
