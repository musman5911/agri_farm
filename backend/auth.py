from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
import os
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
def verify_password(p, h): return pwd_context.verify(p, h)
def get_password_hash(p): return pwd_context.hash(p)
def create_access_token(data): 
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=1440)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, os.getenv("SECRET_KEY"), algorithm=os.getenv("ALGORITHM"))