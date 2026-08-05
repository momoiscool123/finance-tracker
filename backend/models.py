"""
Database tables, defined as code (SQLModel).

Running database.py reads these classes and generates the SQLite tables, so the
schema is reproducible: any teammate can regenerate the database by running the
code — there's no hand-made .db file to pass around.

Money convention: all amounts are stored as INTEGER *piastres* (1 EGP = 100
piastres). So EGP 40.50 is stored as 4050. This keeps money math exact (no
floating-point rounding) and makes summing item prices precise. Divide by 100
when displaying.

Relationship chain:  User  ──has many──▶  Transaction  ──has many──▶  Item
"""

from typing import List, Optional

from sqlmodel import Field, Relationship, SQLModel


class User(SQLModel, table=True):
    __tablename__ = "users"

    user_id: Optional[int] = Field(default=None, primary_key=True)
    # unique=True → the database refuses two users with the same email
    email: str = Field(unique=True, index=True)
    name: str
    # the salted bcrypt hash — NEVER store the plaintext password
    password_hash: str

    # one user has many transactions
    transactions: List["Transaction"] = Relationship(back_populates="user")


class Transaction(SQLModel, table=True):
    __tablename__ = "transactions"

    transaction_id: Optional[int] = Field(default=None, primary_key=True)
    # foreign key: which user this transaction belongs to
    user_id: int = Field(foreign_key="users.user_id")
    description: str
    # TOTAL for the transaction, in piastres.
    # Your API sets this = the sum of the item prices when creating a transaction.
    price: int = Field(default=0)
    date: str  # store as ISO 8601 text, e.g. "2026-07-29"
    category: Optional[str] = Field(default=None)

    user: Optional[User] = Relationship(back_populates="transactions")
    # one transaction has many items; deleting a transaction deletes its items too
    items: List["Item"] = Relationship(
        back_populates="transaction",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class Item(SQLModel, table=True):
    __tablename__ = "items"

    item_id: Optional[int] = Field(default=None, primary_key=True)
    # foreign key: which transaction this item is a line of
    transaction_id: int = Field(foreign_key="transactions.transaction_id")
    item_name: str
    item_price: int  # in piastres

    transaction: Optional[Transaction] = Relationship(back_populates="items")


class RecurringExpense(SQLModel, table=True):
    """A subscription or bill that creates a transaction every week or month."""

    __tablename__ = "recurring_expenses"

    recurring_expense_id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.user_id", index=True)
    description: str
    category: str
    # Stored in piastres, just like Transaction.price.
    amount: int
    frequency: str  # "weekly" or "monthly"
    next_due_date: str  # ISO 8601 date
    active: bool = Field(default=True)


class QuickExpense(SQLModel, table=True):
    """A reusable one-tap expense, such as fuel or parking."""

    __tablename__ = "quick_expenses"

    quick_expense_id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.user_id", index=True)
    description: str
    category: str
    # Stored in piastres.
    amount: int


class SavingsGoal(SQLModel, table=True):
    """A named savings bucket the user is putting money toward (e.g. "Japan
    trip"). The amount saved so far is the sum of its contributions."""

    __tablename__ = "savings_goals"

    goal_id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.user_id", index=True)
    name: str
    target_amount: int  # piastres
    target_date: Optional[str] = Field(default=None)  # ISO 8601 date, optional
    priority: str = Field(default="medium")  # low | medium | high
    created_at: str  # ISO 8601 date

    # Each deposit into the bucket; deleting the goal deletes its contributions.
    contributions: List["Contribution"] = Relationship(
        back_populates="goal",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class Contribution(SQLModel, table=True):
    """One deposit into a savings goal."""

    __tablename__ = "contributions"

    contribution_id: Optional[int] = Field(default=None, primary_key=True)
    goal_id: int = Field(foreign_key="savings_goals.goal_id", index=True)
    amount: int  # piastres
    created_at: str  # ISO 8601 datetime

    goal: Optional[SavingsGoal] = Relationship(back_populates="contributions")
