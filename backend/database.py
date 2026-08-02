"""
Database connection setup (engine + session) and table creation.

Run this file directly to (re)create the database and all tables:

    cd backend
    source .venv/bin/activate
    python database.py

That's what makes the schema reproducible — the .db file is generated FROM this
code, so it never needs to be shared or committed.
"""

from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine

# Keep the SQLite file at backend/database/financeapp.db
DB_DIR = Path(__file__).parent / "database"
DB_DIR.mkdir(exist_ok=True)
SQLITE_FILE = DB_DIR / "financeapp.db"
DATABASE_URL = f"sqlite:///{SQLITE_FILE}"

# The engine is the connection to the database — created once, reused everywhere.
engine = create_engine(DATABASE_URL, echo=False)


def create_db_and_tables() -> None:
    """Read the models and create any tables that don't exist yet."""
    import models  # noqa: F401  — importing registers the tables with SQLModel

    SQLModel.metadata.create_all(engine)


def get_session():
    """A session = one unit of work (queries, inserts, commits).

    Your API endpoints will use this to talk to the database.
    """
    with Session(engine) as session:
        yield session


if __name__ == "__main__":
    create_db_and_tables()
    print(f"Database and tables created at {SQLITE_FILE}")
