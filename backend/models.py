from pydantic import BaseModel
from typing import Optional

class User(BaseModel):
    username: str
    email: Optional[str] = ""
    role: str = "worker"
    password: str

class UserOut(BaseModel):
    username: str
    email: Optional[str] = ""
    role: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class Crop(BaseModel):
    name: str
    variety: Optional[str] = ""
    plant_date: Optional[str] = ""
    harvest_date: Optional[str] = ""
    status: str = "Growing" # Planted, Growing, Harvesting, Completed
    field: Optional[str] = ""
    yield_kg: Optional[float] = 0.0
    notes: Optional[str] = ""

class FinanceEntry(BaseModel):
    category: str
    amount: float
    type: str  # "expense" or "income"
    date: Optional[str] = None
    crop_id: Optional[str] = None # Link to a specific crop, or "farm-wide"
    notes: Optional[str] = ""

class Task(BaseModel):
    title: str
    status: str = "Pending"
    due_date: Optional[str] = ""
    assigned_to: Optional[str] = "" # username of worker
    priority: Optional[str] = "Medium" # Low, Medium, High