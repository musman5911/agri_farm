from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime
from bson import ObjectId
import os

from database import users_col, crops_col, finance_col, tasks_col
from models import User, UserOut, Crop, FinanceEntry, Task
from auth import verify_password, get_password_hash, create_access_token, decode_access_token

app = FastAPI(title="AgriFarm Management API", version="1.0.0")

# --- CORS MIDDLEWARE ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SECURITY SCHEME ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = await users_col.find_one({"email": email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with this token was not found",
        )
    return user

# --- AUTH ROUTES ---
@app.post("/signup", status_code=status.HTTP_201_CREATED, response_model=UserOut)
async def signup(user: User):
    clean_email = user.email.lower().strip()
    clean_username = user.username.lower().strip()

    # Check for duplicate email or username
    existing_user = await users_col.find_one({
        "$or": [
            {"email": clean_email},
            {"username": clean_username}
        ]
    })
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email or username already exists."
        )

    hashed_password = get_password_hash(user.password)
    user_dict = user.model_dump()
    user_dict["email"] = clean_email
    user_dict["username"] = clean_username
    user_dict["password"] = hashed_password

    await users_col.insert_one(user_dict)
    return user_dict

@app.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    identifier = form_data.username.lower().strip()
    user = await users_col.find_one({
        "$or": [
            {"email": identifier},
            {"username": identifier}
        ]
    })
    
    if not user or not verify_password(form_data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = create_access_token({
        "sub": user["email"],
        "role": user.get("role", "worker"),
        "username": user["username"]
    })
    return {"access_token": token, "token_type": "bearer", "role": user.get("role", "worker")}

# --- CROP ROUTES ---
@app.get("/crops")
async def get_crops(current_user: dict = Depends(get_current_user)):
    data = await crops_col.find().to_list(100)
    for d in data:
        d["_id"] = str(d["_id"])
    return data

@app.post("/crops", status_code=status.HTTP_201_CREATED)
async def add_crop(crop: Crop, current_user: dict = Depends(get_current_user)):
    crop_dict = crop.model_dump()
    await crops_col.insert_one(crop_dict)
    return {"status": "ok"}

@app.patch("/crops/{crop_id}")
async def update_crop_status(crop_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    new_status = payload.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status is required")
    try:
        obj_id = ObjectId(crop_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid crop ID format")
    
    result = await crops_col.update_one({"_id": obj_id}, {"$set": {"status": new_status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Crop not found")
    return {"status": "ok"}

@app.delete("/crops/{crop_id}")
async def delete_crop(crop_id: str, current_user: dict = Depends(get_current_user)):
    try:
        obj_id = ObjectId(crop_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid crop ID format")
    
    result = await crops_col.delete_one({"_id": obj_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Crop not found")
    return {"status": "ok"}

# --- FINANCE ROUTES ---
@app.get("/finance")
async def get_finance(current_user: dict = Depends(get_current_user)):
    data = await finance_col.find().to_list(100)
    for d in data:
        d["_id"] = str(d["_id"])
    return data

@app.post("/finance", status_code=status.HTTP_201_CREATED)
async def add_finance(entry: FinanceEntry, current_user: dict = Depends(get_current_user)):
    entry_dict = entry.model_dump()
    entry_dict["date"] = str(datetime.now().date())
    await finance_col.insert_one(entry_dict)
    return {"status": "ok"}

@app.delete("/finance/{finance_id}")
async def delete_finance(finance_id: str, current_user: dict = Depends(get_current_user)):
    try:
        obj_id = ObjectId(finance_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid finance ID format")
    
    result = await finance_col.delete_one({"_id": obj_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Finance entry not found")
    return {"status": "ok"}

# --- TASK ROUTES ---
@app.get("/tasks")
async def get_tasks(current_user: dict = Depends(get_current_user)):
    data = await tasks_col.find().to_list(100)
    for d in data:
        d["_id"] = str(d["_id"])
    return data

@app.post("/tasks", status_code=status.HTTP_201_CREATED)
async def add_task(task: Task, current_user: dict = Depends(get_current_user)):
    task_dict = task.model_dump()
    task_dict["status"] = "Pending"
    await tasks_col.insert_one(task_dict)
    return {"status": "ok"}

@app.patch("/tasks/{task_id}")
async def complete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    try:
        obj_id = ObjectId(task_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid task ID format"
        )
    
    result = await tasks_col.update_one({"_id": obj_id}, {"$set": {"status": "Completed"}})
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    return {"status": "ok"}

@app.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    try:
        obj_id = ObjectId(task_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid task ID format")
    
    result = await tasks_col.delete_one({"_id": obj_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"status": "ok"}
