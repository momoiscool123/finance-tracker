import os
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, Depends, HTTPException
import bcrypt
from sqlmodel import select
from database import get_session
from models import User
from pydantic import BaseModel
import jwt
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

from routers.food import router as food_router

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

# Food recommendation feature — additive, does not touch the auth routes above.
app.include_router(food_router)


class RegisterRequest(BaseModel):
    email: str
    name: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


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
