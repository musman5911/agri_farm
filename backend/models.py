from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, Literal

class User(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    role: Literal["admin", "worker"] = "worker"
    password: str

    @field_validator('email', mode='before')
    @classmethod
    def check_empty_email(cls, v):
        if v == "" or v is None:
            return None
        return v

class UserOut(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    role: Literal["admin", "worker"]

    @field_validator('email', mode='before')
    @classmethod
    def check_empty_email(cls, v):
        if v == "" or v is None:
            return None
        return v

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class Crop(BaseModel):
    name: str
    variety: Optional[str] = ""
    plant_date: Optional[str] = ""
    harvest_date: Optional[str] = ""
    status: Literal["Planted", "Growing", "Harvesting", "Completed"] = "Growing"
    field: Optional[str] = ""
    yield_kg: Optional[float] = 0.0
    notes: Optional[str] = ""

class FinanceEntry(BaseModel):
    category: str
    amount: float
    type: Literal["expense", "income"]
    date: Optional[str] = None
    crop_id: Optional[str] = None # Link to a specific crop, or "farm-wide"
    notes: Optional[str] = ""

class Task(BaseModel):
    title: str
    status: Literal["Pending", "Completed"] = "Pending"
    due_date: Optional[str] = ""
    assigned_to: Optional[str] = "" # username of worker
    priority: Literal["Low", "Medium", "High"] = "Medium"
