from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt
from passlib.context import CryptContext
from datetime import datetime
from bson import ObjectId
import motor.motor_asyncio
import os
from dotenv import load_dotenv

load_dotenv()

# --- DATABASE SETUP ---
client = motor.motor_asyncio.AsyncIOMotorClient(os.getenv("MONGO_URI"))
db = client.farm_management
users_col = db.users
crops_col = db.crops
finance_col = db.finance
tasks_col = db.tasks

# --- SECURITY SETUP ---
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET = "farm_secret_key_99"

# --- AUTH ROUTES ---
@app.post("/signup")
async def signup(user: dict):
    user["password"] = pwd_context.hash(user["password"])
    await users_col.insert_one(user)
    return {"msg": "User Created"}

@app.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await users_col.find_one({"email": form_data.username})
    if not user or not pwd_context.verify(form_data.password, user["password"]):
        raise HTTPException(401, "Invalid Credentials")
    token = jwt.encode({"sub": user["email"], "role": user.get("role", "admin")}, SECRET)
    return {"access_token": token, "token_type": "bearer"}

# --- CROP ROUTES ---
@app.get("/crops")
async def get_crops():
    data = await crops_col.find().to_list(100)
    for d in data: d["_id"] = str(d["_id"])
    return data

@app.post("/crops")
async def add_crop(crop: dict):
    await crops_col.insert_one(crop)
    return {"status": "ok"}

# --- FINANCE ROUTES ---
@app.get("/finance")
async def get_finance():
    data = await finance_col.find().to_list(100)
    for d in data: d["_id"] = str(d["_id"])
    return data

@app.post("/finance")
async def add_finance(entry: dict):
    entry["date"] = str(datetime.now().date())
    await finance_col.insert_one(entry)
    return {"status": "ok"}

# --- TASK ROUTES ---
@app.get("/tasks")
async def get_tasks():
    data = await tasks_col.find().to_list(100)
    for d in data: d["_id"] = str(d["_id"])
    return data

@app.post("/tasks")
async def add_task(task: dict):
    task["status"] = "Pending"
    await tasks_col.insert_one(task)
    return {"status": "ok"}

@app.patch("/tasks/{task_id}")
async def complete_task(task_id: str):
    await tasks_col.update_one({"_id": ObjectId(task_id)}, {"$set": {"status": "Completed"}})
    return {"status": "ok"}