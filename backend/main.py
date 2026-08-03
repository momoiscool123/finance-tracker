from fastapi import FastAPI, Depends, HTTPException
import bcrypt
from sqlmodel import select
from database import get_session
from models import User
from pydantic import BaseModel

app = FastAPI()

class RegisterRequest(BaseModel):
    email: str
    name: str
    password: str

@app.post("/register")
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