from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
import os

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Access Security Hashing Secret Key - prioritize SECRET_KEY, fallback to JWT_SECRET or SESSION_SECRET, or generate a safe fallback
SECRET_KEY = os.getenv("SECRET_KEY") or os.getenv("JWT_SECRET") or os.getenv("SESSION_SECRET")
if not SECRET_KEY:
    import secrets
    SECRET_KEY = secrets.token_hex(32)
    print("⚠️ WARNING: Neither 'SECRET_KEY', 'JWT_SECRET', nor 'SESSION_SECRET' was found in the environment. Generated a secure random fallback key for this session.")

ALGORITHM = os.getenv("ALGORITHM", "HS256")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=1440)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return {}
