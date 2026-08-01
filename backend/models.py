from pydantic import BaseModel, EmailStr
class User(BaseModel):
    username: str
    email: EmailStr
    role: str = "worker"
    password: str
class UserOut(BaseModel):
    username: str
    email: EmailStr
    role: str
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str