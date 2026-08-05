import os
from datetime import datetime, timedelta, timezone
from datetime import date as date_type
from calendar import monthrange
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import bcrypt
from sqlmodel import select, Session
from database import create_db_and_tables, get_session
from models import (
    User, Transaction, Item, RecurringExpense, QuickExpense,
    SavingsGoal, Contribution,
)
from pydantic import BaseModel
import jwt
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

# Load backend/.env so SECRET_KEY is available via os.getenv()
load_dotenv()

# --- JWT settings ---
SECRET_KEY = os.getenv("SECRET_KEY")      # signing secret, kept in .env (never commit it)
ALGORITHM = "HS256"                        # signing algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = 60           # how long a token stays valid

app = FastAPI()


@app.on_event("startup")
def create_tables_on_startup():
    # New installations—and existing SQLite databases—get the recurring tables
    # automatically. SQLModel only creates tables that are missing.
    create_db_and_tables()

# Allow the React dev server to call this API from the browser (CORS).
# Without this, the browser blocks requests from localhost:3000 to localhost:8000.
app.add_middleware(
    CORSMiddleware,
    # Allow any local dev origin — localhost OR 127.0.0.1, on any port. Without
    # this, opening the app on 127.0.0.1 or a bumped port (e.g. 3001 when 3000
    # is busy) fails the CORS preflight with a 400, which the browser surfaces
    # as "Failed to fetch".
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer_scheme = HTTPBearer()


# ---------------------------------------------------------------------------
# Schemas — auth
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: str
    name: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UpdateProfileRequest(BaseModel):
    name: str
    email: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    

# ---------------------------------------------------------------------------
# Schemas — transactions
# ---------------------------------------------------------------------------
class ItemIn(BaseModel):
    item_name: str
    item_price: int          # piastres — e.g. 4050 for EGP 40.50


class TransactionCreate(BaseModel):
    description: str
    category: Optional[str] = None
    date: Optional[str] = None    # ISO "YYYY-MM-DD"; defaults to today if omitted
    items: List[ItemIn] = []


class ItemOut(BaseModel):
    item_id: int
    item_name: str
    item_price: int


class TransactionOut(BaseModel):
    transaction_id: int
    description: str
    price: int
    date: str
    category: Optional[str]
    items: List[ItemOut]


# ---------------------------------------------------------------------------
# Schemas — auto-categorization
# ---------------------------------------------------------------------------
class CategorizeRequest(BaseModel):
    merchant: str


class CategorizeResponse(BaseModel):
    category: Optional[str] = None
    confidence: float = 0.0
    source: str            # "override" | "model" | "none" | "unavailable"


# ---------------------------------------------------------------------------
# Schemas — recurring & quick expenses
# ---------------------------------------------------------------------------
class RecurringExpenseIn(BaseModel):
    description: str
    category: str
    amount: int  # piastres
    frequency: str  # weekly | monthly
    next_due_date: str


class RecurringExpenseOut(RecurringExpenseIn):
    recurring_expense_id: int
    active: bool


class QuickExpenseIn(BaseModel):
    description: str
    category: str
    amount: int  # piastres


class QuickExpenseOut(QuickExpenseIn):
    quick_expense_id: int
# ---------------------------------------------------------------------------
# Dependency: get the current authenticated user from the Bearer token
# ---------------------------------------------------------------------------
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    session: Session = Depends(get_session),
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def validate_expense_input(description: str, category: str, amount: int) -> tuple[str, str]:
    """Keep recurring/template data valid even if a client bypasses the UI."""
    clean_description = description.strip()
    clean_category = category.strip()
    if not clean_description:
        raise HTTPException(status_code=400, detail="A description is required")
    if not clean_category:
        raise HTTPException(status_code=400, detail="A category is required")
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be above zero")
    return clean_description, clean_category


def parse_due_date(value: str) -> date_type:
    try:
        return date_type.fromisoformat(value)
    except ValueError:
        raise HTTPException(status_code=400, detail="Use a valid due date (YYYY-MM-DD)")


def advance_due_date(current: date_type, frequency: str) -> date_type:
    if frequency == "weekly":
        return current + timedelta(days=7)
    if frequency == "monthly":
        month = 1 if current.month == 12 else current.month + 1
        year = current.year + 1 if current.month == 12 else current.year
        return date_type(year, month, min(current.day, monthrange(year, month)[1]))
    raise HTTPException(status_code=400, detail="Frequency must be weekly or monthly")


def create_transaction_row(user_id: int, description: str, category: str, amount: int, when: date_type):
    """Build one normal transaction so generated and manual expenses look identical."""
    return Transaction(
        user_id=user_id,
        description=description,
        category=category,
        date=when.isoformat(),
        price=amount,
        items=[Item(item_name=description, item_price=amount)],
    )


def apply_due_recurring_expenses(current_user: User, session: Session) -> None:
    """Materialise every due subscription once, including missed periods.

    This runs when the signed-in user fetches their transactions, so no separate
    background server or cron job is required for this local application.
    """
    today = date_type.today()
    rules = (
        session.query(RecurringExpense)
        .filter(RecurringExpense.user_id == current_user.user_id, RecurringExpense.active == True)
        .all()
    )
    changed = False
    for rule in rules:
        due = parse_due_date(rule.next_due_date)
        while due <= today:
            session.add(
                create_transaction_row(
                    current_user.user_id, rule.description, rule.category, rule.amount, due
                )
            )
            due = advance_due_date(due, rule.frequency)
            changed = True
        rule.next_due_date = due.isoformat()
    if changed:
        session.commit()


@app.post("/auth/register")
def register_user(request: RegisterRequest, session=Depends(get_session)):
    # Normalise + validate first, so we never create blank/garbage accounts.
    # (A blank account is what let empty email + empty password log in.)
    email = request.email.strip().lower()
    name = request.name.strip()
    password = request.password

    if not email or "@" not in email or "." not in email:
        raise HTTPException(status_code=400, detail="A valid email is required")
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    existing_user = session.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    password_hash = hashed.decode("utf-8")

    user = User(email=email, name=name, password_hash=password_hash)

    session.add(user)
    session.commit()
    session.refresh(user)

    return {"user_id": user.user_id}


@app.post("/auth/login")
def login_user(request: LoginRequest, session=Depends(get_session)):
    email = request.email.strip().lower()
    password = request.password

    # Reject blank credentials before touching the database, so an empty
    # email can never match an account (defence in depth).
    if not email or not password:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = session.query(User).filter(User.email == email).first()

    if not user or not bcrypt.checkpw(
        password.encode("utf-8"), user.password_hash.encode("utf-8")
    ):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Build the token: who it's for (sub) + when it expires (exp)
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user.user_id), "exp": expire}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    return {"access_token": token, "token_type": "bearer"}


@app.get("/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    # "Who am I?" — reads the token and returns the current user's basic info.
    return {
        "user_id": current_user.user_id,
        "name": current_user.name,
        "email": current_user.email,
    }


@app.put("/auth/me")
def update_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # Update the signed-in user's name and email. Validated the same way as
    # registration so we never store a blank name or malformed email.
    name = request.name.strip()
    email = request.email.strip().lower()

    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    if not email or "@" not in email or "." not in email:
        raise HTTPException(status_code=400, detail="A valid email is required")

    # Make sure the new email isn't already taken by a *different* user.
    clash = (
        session.query(User)
        .filter(User.email == email, User.user_id != current_user.user_id)
        .first()
    )
    if clash:
        raise HTTPException(status_code=400, detail="That email is already in use")

    current_user.name = name
    current_user.email = email
    session.add(current_user)
    session.commit()
    session.refresh(current_user)

    return {
        "user_id": current_user.user_id,
        "name": current_user.name,
        "email": current_user.email,
    }


@app.put("/auth/password")
def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # Require the current password before changing it, so a leaked/borrowed
    # session can't silently reset the password.
    if not bcrypt.checkpw(
        request.current_password.encode("utf-8"),
        current_user.password_hash.encode("utf-8"),
    ):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(request.new_password) < 8:
        raise HTTPException(
            status_code=400, detail="New password must be at least 8 characters"
        )

    hashed = bcrypt.hashpw(request.new_password.encode("utf-8"), bcrypt.gensalt())
    current_user.password_hash = hashed.decode("utf-8")
    session.add(current_user)
    session.commit()

    return {"status": "Password updated"}

# ---------------------------------------------------------------------------
# Transaction routes
# ---------------------------------------------------------------------------
@app.post("/transactions", response_model=TransactionOut, status_code=201)
def create_transaction(
    request: TransactionCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    items = [Item(item_name=i.item_name, item_price=i.item_price) for i in request.items]
    total_price = sum(i.item_price for i in items)

    transaction = Transaction(
        user_id=current_user.user_id,
        description=request.description,
        category=request.category,
        date=request.date or date_type.today().isoformat(),
        price=total_price,
        items=items,
    )

    session.add(transaction)
    session.commit()
    session.refresh(transaction)

    return transaction


@app.get("/transactions", response_model=List[TransactionOut])
def list_transactions(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # Make weekly/monthly subscriptions appear as normal dated transactions
    # before returning the ledger.
    apply_due_recurring_expenses(current_user, session)
    return (
        session.query(Transaction)
        .filter(Transaction.user_id == current_user.user_id)
        .all()
    )


@app.get("/transactions/{transaction_id}", response_model=TransactionOut)
def get_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    transaction = session.get(Transaction, transaction_id)
    if not transaction or transaction.user_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="Transaction not found")

    return transaction


@app.put("/transactions/{transaction_id}", response_model=TransactionOut)
def update_transaction(
    transaction_id: int,
    request: TransactionCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    transaction = session.get(Transaction, transaction_id)
    if not transaction or transaction.user_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Overwrite the editable fields with the new values.
    transaction.description = request.description
    transaction.category = request.category
    if request.date:
        transaction.date = request.date
    # Replace the line items; the delete-orphan cascade drops the old ones, and
    # the total price is recomputed from the new items (same rule as create).
    transaction.items = [Item(item_name=i.item_name, item_price=i.item_price) for i in request.items]
    transaction.price = sum(i.item_price for i in request.items)

    session.add(transaction)
    session.commit()
    session.refresh(transaction)

    return transaction


@app.delete("/transactions/{transaction_id}", status_code=204)
def delete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    transaction = session.get(Transaction, transaction_id)
    if not transaction or transaction.user_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="Transaction not found")

    session.delete(transaction)  # cascade also removes its items
    session.commit()
    return None


# ---------------------------------------------------------------------------
# Auto-categorization (Phase D)
# Guess a category from the merchant name so the Add-Transaction form can
# pre-fill it. The user can still override the choice.
# ---------------------------------------------------------------------------
@app.post("/categorize", response_model=CategorizeResponse)
def categorize_merchant(
    request: CategorizeRequest,
    current_user: User = Depends(get_current_user),
):
    # Imported lazily so the API (and its other routes) start fine even in an
    # environment where the ML libraries aren't installed.
    from ml.categorize import categorize

    return categorize(request.merchant)


# ---------------------------------------------------------------------------
# Recurring subscriptions and quick expenses
# ---------------------------------------------------------------------------
@app.get("/recurring-expenses", response_model=List[RecurringExpenseOut])
def list_recurring_expenses(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    apply_due_recurring_expenses(current_user, session)
    return (
        session.query(RecurringExpense)
        .filter(RecurringExpense.user_id == current_user.user_id)
        .order_by(RecurringExpense.next_due_date)
        .all()
    )


@app.post("/recurring-expenses", response_model=RecurringExpenseOut, status_code=201)
def create_recurring_expense(
    request: RecurringExpenseIn,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    description, category = validate_expense_input(request.description, request.category, request.amount)
    if request.frequency not in {"weekly", "monthly"}:
        raise HTTPException(status_code=400, detail="Frequency must be weekly or monthly")
    due = parse_due_date(request.next_due_date)
    rule = RecurringExpense(
        user_id=current_user.user_id,
        description=description,
        category=category,
        amount=request.amount,
        frequency=request.frequency,
        next_due_date=due.isoformat(),
    )
    session.add(rule)
    session.commit()
    session.refresh(rule)
    return rule


@app.delete("/recurring-expenses/{recurring_expense_id}", status_code=204)
def delete_recurring_expense(
    recurring_expense_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    rule = session.get(RecurringExpense, recurring_expense_id)
    if not rule or rule.user_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="Recurring expense not found")
    session.delete(rule)
    session.commit()
    return None


@app.get("/quick-expenses", response_model=List[QuickExpenseOut])
def list_quick_expenses(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return (
        session.query(QuickExpense)
        .filter(QuickExpense.user_id == current_user.user_id)
        .order_by(QuickExpense.description)
        .all()
    )


@app.post("/quick-expenses", response_model=QuickExpenseOut, status_code=201)
def create_quick_expense(
    request: QuickExpenseIn,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    description, category = validate_expense_input(request.description, request.category, request.amount)
    shortcut = QuickExpense(
        user_id=current_user.user_id,
        description=description,
        category=category,
        amount=request.amount,
    )
    session.add(shortcut)
    session.commit()
    session.refresh(shortcut)
    return shortcut


@app.post("/quick-expenses/{quick_expense_id}/log", response_model=TransactionOut, status_code=201)
def log_quick_expense(
    quick_expense_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    shortcut = session.get(QuickExpense, quick_expense_id)
    if not shortcut or shortcut.user_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="Quick expense not found")
    transaction = create_transaction_row(
        current_user.user_id,
        shortcut.description,
        shortcut.category,
        shortcut.amount,
        date_type.today(),
    )
    session.add(transaction)
    session.commit()
    session.refresh(transaction)
    return transaction


@app.delete("/quick-expenses/{quick_expense_id}", status_code=204)
def delete_quick_expense(
    quick_expense_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    shortcut = session.get(QuickExpense, quick_expense_id)
    if not shortcut or shortcut.user_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="Quick expense not found")
    session.delete(shortcut)
    session.commit()
    return None


# ---------------------------------------------------------------------------
# Savings goals ("buckets")
# ---------------------------------------------------------------------------
class ContributionOut(BaseModel):
    contribution_id: int
    amount: int          # piastres
    created_at: str


class ContributionIn(BaseModel):
    amount: int                 # piastres
    date: Optional[str] = None  # YYYY-MM-DD; defaults to "now" when omitted


class SavingsGoalIn(BaseModel):
    name: str
    target_amount: int          # piastres
    current_amount: int = 0     # optional starting balance, piastres
    started_on: Optional[str] = None  # date of the starting balance (first contribution)
    target_date: Optional[str] = None
    priority: str = "medium"


class SavingsGoalOut(BaseModel):
    goal_id: int
    name: str
    target_amount: int
    target_date: Optional[str]
    priority: str
    created_at: str
    saved_amount: int                        # computed: sum of contributions
    contributions: List[ContributionOut]


def _goal_out(goal: SavingsGoal) -> dict:
    ordered = sorted(goal.contributions, key=lambda c: c.created_at, reverse=True)
    return {
        "goal_id": goal.goal_id,
        "name": goal.name,
        "target_amount": goal.target_amount,
        "target_date": goal.target_date,
        "priority": goal.priority,
        "created_at": goal.created_at,
        "saved_amount": sum(c.amount for c in goal.contributions),
        "contributions": [
            {"contribution_id": c.contribution_id, "amount": c.amount, "created_at": c.created_at}
            for c in ordered
        ],
    }


def _contribution_datetime(picked: Optional[str], earliest: Optional[date_type]) -> str:
    """Turn an optional picked date (YYYY-MM-DD) into the stored timestamp.

    Rules: a date can't be in the future, and can't be before `earliest` (the
    first contribution's date) when one is given. The very first contribution
    passes earliest=None, so it may be any date up to today. Omitting the date
    keeps the old behaviour ("now").
    """
    if not picked:
        return datetime.now(timezone.utc).isoformat()
    try:
        day = date_type.fromisoformat(picked)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date")
    if day > date_type.today():
        raise HTTPException(status_code=400, detail="Date can't be in the future")
    if earliest is not None and day < earliest:
        raise HTTPException(
            status_code=400,
            detail=f"Date can't be before the goal's start date ({earliest.isoformat()})",
        )
    return f"{picked}T12:00:00+00:00"


@app.get("/goals", response_model=List[SavingsGoalOut])
def list_goals(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    goals = (
        session.query(SavingsGoal)
        .filter(SavingsGoal.user_id == current_user.user_id)
        .all()
    )
    return [_goal_out(g) for g in goals]


@app.post("/goals", response_model=SavingsGoalOut, status_code=201)
def create_goal(
    request: SavingsGoalIn,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Give your goal a name")
    if request.target_amount <= 0:
        raise HTTPException(status_code=400, detail="Target amount must be above zero")
    if request.priority not in {"low", "medium", "high"}:
        raise HTTPException(status_code=400, detail="Priority must be low, medium, or high")

    # Optional start date for the goal's timeline (defaults to today). It's the
    # earliest date any contribution — including the opening balance — can carry.
    start = date_type.today()
    if request.started_on:
        try:
            start = date_type.fromisoformat(request.started_on)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start date")
        if start > date_type.today():
            raise HTTPException(status_code=400, detail="Start date can't be in the future")

    goal = SavingsGoal(
        user_id=current_user.user_id,
        name=name,
        target_amount=request.target_amount,
        target_date=request.target_date or None,
        priority=request.priority,
        created_at=start.isoformat(),
    )
    # A non-zero starting balance becomes the first contribution, dated to the
    # goal's start date, so the history and the saved total always agree.
    if request.current_amount and request.current_amount > 0:
        goal.contributions.append(
            Contribution(
                amount=request.current_amount,
                created_at=f"{start.isoformat()}T12:00:00+00:00",
            )
        )

    session.add(goal)
    session.commit()
    session.refresh(goal)
    return _goal_out(goal)


@app.post("/goals/{goal_id}/contributions", response_model=SavingsGoalOut, status_code=201)
def add_contribution(
    goal_id: int,
    request: ContributionIn,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    goal = session.get(SavingsGoal, goal_id)
    if not goal or goal.user_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="Goal not found")
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Contribution must be above zero")

    # Contributions live between the goal's start date and today.
    start = date_type.fromisoformat(goal.created_at[:10])
    goal.contributions.append(
        Contribution(
            amount=request.amount,
            created_at=_contribution_datetime(request.date, start),
        )
    )
    session.add(goal)
    session.commit()
    session.refresh(goal)
    return _goal_out(goal)


@app.delete("/goals/{goal_id}", status_code=204)
def delete_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    goal = session.get(SavingsGoal, goal_id)
    if not goal or goal.user_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="Goal not found")
    session.delete(goal)  # cascade removes its contributions
    session.commit()
    return None
