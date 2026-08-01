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

# --- STARTUP EVENT — AUTO-CREATE DEFAULT ADMIN ---
@app.on_event("startup")
async def create_default_admin():
    try:
        # Check if we can connect to MongoDB
        from database import client
        await client.admin.command('ping')
        print("✅ Successfully connected to MongoDB!")
        
        # Check if any admin account exists
        admin_user = await users_col.find_one({"role": "admin"})
        if not admin_user:
            # Create default administrator account
            hashed_password = get_password_hash("adminpassword123")
            default_admin = {
                "username": "admin",
                "email": "admin@farm.com",
                "role": "admin",
                "password": hashed_password
            }
            await users_col.insert_one(default_admin)
            print("👑 [Seeder] Created default administrator account:")
            print("   Email: admin@farm.com")
            print("   Password: adminpassword123")
        else:
            print("👑 [Status] Administrator account verified.")
    except Exception as e:
        print(f"⚠️ Database Warning: Could not initialize or seed default admin on startup: {e}")

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

# --- HEALTH CHECK ROUTE ---
@app.get("/")
async def root():
    return {"message": "Welcome to AgriFarm Management API!"}

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

# --- USER MANAGEMENT ROUTES (ADMIN ONLY) ---
@app.get("/users")
async def get_users(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin authorization required")
    users = await users_col.find().to_list(100)
    for u in users:
        u["_id"] = str(u["_id"])
        if "password" in u:
            del u["password"]
    return users

@app.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin authorization required")
    try:
        obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format")
    
    if str(current_user["_id"]) == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own account")
        
    result = await users_col.delete_one({"_id": obj_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return {"status": "ok"}

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

@app.put("/crops/{crop_id}")
async def update_crop(crop_id: str, crop: Crop, current_user: dict = Depends(get_current_user)):
    try:
        obj_id = ObjectId(crop_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid crop ID format")
    
    crop_dict = crop.model_dump()
    result = await crops_col.replace_one({"_id": obj_id}, crop_dict)
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Crop not found")
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
    if not entry_dict.get("date"):
        entry_dict["date"] = str(datetime.now().date())
    await finance_col.insert_one(entry_dict)
    return {"status": "ok"}

@app.put("/finance/{finance_id}")
async def update_finance(finance_id: str, entry: FinanceEntry, current_user: dict = Depends(get_current_user)):
    try:
        obj_id = ObjectId(finance_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid finance ID format")
    
    entry_dict = entry.model_dump()
    if not entry_dict.get("date"):
        entry_dict["date"] = str(datetime.now().date())
    result = await finance_col.replace_one({"_id": obj_id}, entry_dict)
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finance entry not found")
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

@app.put("/tasks/{task_id}")
async def update_task(task_id: str, task: Task, current_user: dict = Depends(get_current_user)):
    try:
        obj_id = ObjectId(task_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid task ID format")
    
    task_dict = task.model_dump()
    result = await tasks_col.replace_one({"_id": obj_id}, task_dict)
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
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

# --- BACKUP & RESTORE ROUTES (ADMIN ONLY) ---
@app.get("/backup")
async def get_backup(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin authorization required")
    crops_list = await crops_col.find().to_list(500)
    for c in crops_list: c["_id"] = str(c["_id"])
    finance_list = await finance_col.find().to_list(500)
    for f in finance_list: f["_id"] = str(f["_id"])
    tasks_list = await tasks_col.find().to_list(500)
    for t in tasks_list: t["_id"] = str(t["_id"])
    users_list = await users_col.find().to_list(100)
    for u in users_list:
        u["_id"] = str(u["_id"])
        if "password" in u: del u["password"]
    return {
        "crops": crops_list,
        "finance": finance_list,
        "tasks": tasks_list,
        "users": users_list
    }

@app.post("/restore")
async def restore_backup(payload: dict, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin authorization required")
    
    crops_data = payload.get("crops", [])
    finance_data = payload.get("finance", [])
    tasks_data = payload.get("tasks", [])
    
    if not crops_data and not finance_data and not tasks_data:
        raise HTTPException(status_code=400, detail="Backup has no valid data to restore")
    
    if crops_data:
        await crops_col.delete_many({})
        for c in crops_data:
            if "_id" in c:
                try: c["_id"] = ObjectId(c["_id"])
                except Exception: del c["_id"]
        await crops_col.insert_many(crops_data)
        
    if finance_data:
        await finance_col.delete_many({})
        for f in finance_data:
            if "_id" in f:
                try: f["_id"] = ObjectId(f["_id"])
                except Exception: del f["_id"]
        await finance_col.insert_many(finance_data)
        
    if tasks_data:
        await tasks_col.delete_many({})
        for t in tasks_data:
            if "_id" in t:
                try: t["_id"] = ObjectId(t["_id"])
                except Exception: del t["_id"]
        await tasks_col.insert_many(tasks_data)
        
    return {"status": "ok"}
