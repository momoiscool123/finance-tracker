import os
from datetime import datetime, timedelta, timezone
from datetime import date as date_type
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import bcrypt
from sqlmodel import select, Session
from database import get_session
from models import User, Transaction, Item
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

# Allow the React dev server to call this API from the browser (CORS).
# Without this, the browser blocks requests from localhost:3000 to localhost:8000.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
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


@app.post("/auth/register")
def register_user(request: RegisterRequest, session=Depends(get_session)):
    existing_user = session.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = bcrypt.hashpw(request.password.encode("utf-8"), bcrypt.gensalt())
    password_hash = hashed.decode("utf-8")

    user = User(email=request.email, name=request.name, password_hash=password_hash)

    session.add(user)
    session.commit()
    session.refresh(user)

    return {"user_id": user.user_id}


@app.post("/auth/login")
def login_user(request: LoginRequest, session=Depends(get_session)):
    user = session.query(User).filter(User.email == request.email).first()

    if not user or not bcrypt.checkpw(
        request.password.encode("utf-8"), user.password_hash.encode("utf-8")
    ):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Build the token: who it's for (sub) + when it expires (exp)
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user.user_id), "exp": expire}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    return {"access_token": token, "token_type": "bearer"}

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