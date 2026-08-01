from pydantic import BaseModel
from typing import Optional

class User(BaseModel):
    username: str
    email: str
    role: str = "worker"
    password: str

class UserOut(BaseModel):
    username: str
    email: str
    role: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class Crop(BaseModel):
    name: str
    status: str = "Growing"

class FinanceEntry(BaseModel):
    category: str
    amount: float
    type: str  # "expense" or "income"
    date: Optional[str] = None

class Task(BaseModel):
    title: str
    status: str = "Pending"