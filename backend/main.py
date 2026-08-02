from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime
from bson import ObjectId
import os
import random
from typing import Optional

from database import db, users_col, crops_col, finance_col, tasks_col, resets_col
from models import User, UserOut, Crop, FinanceEntry, Task
from auth import verify_password, get_password_hash, create_access_token, decode_access_token
from mailer import send_email

app = FastAPI(title="AgriFarm Management API", version="1.0.0")

# --- CORS MIDDLEWARE ---
frontend_urls_str = os.getenv("FRONTEND_URL", "http://localhost:3030,http://127.0.0.1:3030")
frontend_origins = [url.strip() for url in frontend_urls_str.split(",") if url.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- STARTUP EVENT — VERIFY DATABASE CONNECTION ---
@app.on_event("startup")
async def verify_db_connection():
    try:
        # Check if we can connect to MongoDB
        from database import client
        await client.admin.command('ping')
        print("✅ Successfully connected to MongoDB!")
        
        # Check if any admin account exists
        admin_user = await users_col.find_one({"role": "admin"})
        if not admin_user:
            print("👑 [Status] No administrator account is registered yet. First-time setup is active.")
        else:
            print("👑 [Status] Administrator account verified.")
    except Exception as e:
        print(f"⚠️ Database Warning: Could not initialize connection on startup: {e}")

# --- SECURITY SCHEME ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = await users_col.find_one({
        "$or": [
            {"email": sub},
            {"username": sub}
        ]
    })
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with this token was not found",
        )
    return user

async def get_current_user_optional(token: Optional[str] = Depends(oauth2_scheme_optional)):
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        sub = payload.get("sub")
        if sub:
            return await users_col.find_one({
                "$or": [
                    {"email": sub},
                    {"username": sub}
                ]
            })
    except Exception:
        return None
    return None

# --- HEALTH CHECK ROUTE ---
@app.get("/")
async def root():
    return {"message": "Welcome to AgriFarm Management API!"}

# --- SETUP CHECK ROUTE ---
@app.get("/check-setup")
async def check_setup():
    count = await users_col.count_documents({})
    return {"setup_done": count > 0}

# --- AUTH ROUTES ---
@app.post("/signup", status_code=status.HTTP_201_CREATED, response_model=UserOut)
async def signup(user: User, current_user: Optional[dict] = Depends(get_current_user_optional)):
    user_count = await users_col.count_documents({})
    if user_count > 0:
        if not current_user or current_user.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Registration is restricted to Administrators only."
            )

    clean_email = user.email.lower().strip() if user.email else ""
    clean_username = user.username.lower().strip()

    # Check for duplicate email or username
    existing_user = await users_col.find_one({
        "$or": [
            {"email": clean_email} if clean_email else {"email": "NON_EXISTENT_DUMMY_VALUE_99"},
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
        "sub": user["email"] if user.get("email") else user["username"],
        "role": user.get("role", "worker"),
        "username": user["username"]
    })
    return {"access_token": token, "token_type": "bearer", "role": user.get("role", "worker")}

@app.post("/change-password")
async def change_password(payload: dict, current_user: dict = Depends(get_current_user)):
    # Workers cannot change password, only Admin!
    if current_user.get("role") != "admin":
         raise HTTPException(status_code=403, detail="Password updates are restricted to Administrators only.")
         
    current_password = payload.get("currentPassword")
    new_password = payload.get("newPassword")
    code = payload.get("code", "").strip()
    
    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="Current and new passwords are required")
    if len(new_password) < 4:
        raise HTTPException(status_code=400, detail="New password must be at least 4 characters")
    
    if not verify_password(current_password, current_user["password"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
        
    if not code:
        raise HTTPException(status_code=400, detail="Verification code is required to update administrative password.")
    # Verify code
    current_email = current_user.get("email", "")
    reset_record = await resets_col.find_one({"email": current_email, "code": code})
    if not reset_record or reset_record.get("expiry", 0) < datetime.utcnow().timestamp():
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")
    # Clear code
    await resets_col.delete_many({"email": current_email})
    
    hashed_password = get_password_hash(new_password)
    await users_col.update_one({"_id": current_user["_id"]}, {"$set": {"password": hashed_password}})
    return {"status": "ok"}

@app.get("/users/me", response_model=UserOut)
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@app.post("/request-profile-code")
async def request_profile_code(current_user: dict = Depends(get_current_user)):
    email = current_user.get("email", "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="No email address is registered on this account to send a code.")
    
    code = str(random.randint(100000, 999999))
    expiry = datetime.utcnow().timestamp() + 600  # 10 minutes
    
    await resets_col.delete_many({"email": email})
    await resets_col.insert_one({
        "email": email,
        "code": code,
        "expiry": expiry
    })
    
    subject = "AgriFarm Secure Profile Authorization Code"
    html_content = f"""
    <div style="font-family: sans-serif; padding: 25px; background-color: #0b0f19; color: #f1f5f9; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #1e293b;">
        <h2 style="color: #16a34a; border-bottom: 1px solid #1e293b; padding-bottom: 10px; margin-top: 0;">AgriFarm Command Profile Authorization</h2>
        <p style="font-size: 14px; line-height: 1.5; color: #94a3b8;">You requested an administrative authorization code to update your profile (email or password). Use the code below to complete this action:</p>
        <div style="background-color: #1e293b; padding: 15px; border-radius: 8px; font-size: 26px; font-weight: bold; text-align: center; color: #16a34a; letter-spacing: 4px; margin: 20px 0; border: 1px solid #334155;">
            {code}
        </div>
        <p style="font-size: 11px; color: #64748b;">This code is strictly active for 10 minutes. If you did not authorize this action, secure your account immediately.</p>
    </div>
    """
    sent = await send_email(email, subject, html_content)
    if not sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SMTP service failed to deliver the verification code. Please check that SMTP credentials are configured correctly in the environment."
        )
    return {"status": "ok", "message": "Verification code has been successfully emailed!"}

@app.put("/users/me")
async def update_me(payload: dict, current_user: dict = Depends(get_current_user)):
    email = payload.get("email", "").lower().strip()
    code = payload.get("code", "").strip()
    
    if current_user.get("role") == "admin":
        if not code:
            raise HTTPException(status_code=400, detail="Verification code is required to update administrative email.")
        # Verify code
        current_email = current_user.get("email", "")
        reset_record = await resets_col.find_one({"email": current_email, "code": code})
        if not reset_record or reset_record.get("expiry", 0) < datetime.utcnow().timestamp():
            raise HTTPException(status_code=400, detail="Invalid or expired verification code.")
        # Clear code
        await resets_col.delete_many({"email": current_email})
        
    await users_col.update_one({"_id": current_user["_id"]}, {"$set": {"email": email}})
    return {"status": "ok", "email": email}

# --- AUTOMATION SETTINGS ---
@app.get("/settings/automations")
async def get_automations(current_user: dict = Depends(get_current_user)):
    settings = await db.settings.find_one({"key": "automations"})
    if not settings:
        return {
            "cron_enabled": True,
            "schedule": "0 8 * * *",
            "alert_soil": True,
            "alert_finance": True,
            "alert_tasks": True,
            "recipient": current_user.get("email", "")
        }
    settings_data = settings["value"]
    # Ensure recipient matches current user if empty
    if not settings_data.get("recipient"):
        settings_data["recipient"] = current_user.get("email", "")
    return settings_data

@app.put("/settings/automations")
async def save_automations(payload: dict, current_user: dict = Depends(get_current_user)):
    await db.settings.update_one(
        {"key": "automations"},
        {"$set": {"value": payload}},
        upsert=True
    )
    return {"status": "ok"}

@app.post("/settings/automations/trigger")
async def trigger_automations(current_user: dict = Depends(get_current_user)):
    settings = await db.settings.find_one({"key": "automations"})
    if not settings:
        raise HTTPException(status_code=400, detail="Automation settings must be configured and saved first.")
    
    settings_data = settings["value"]
    recipients_str = settings_data.get("recipient", "").strip()
    if not recipients_str:
        raise HTTPException(status_code=400, detail="No recipient emails are configured in your automation rules.")
        
    recipients = [r.strip() for r in recipients_str.split(",") if r.strip()]
    if not recipients:
         raise HTTPException(status_code=400, detail="Invalid recipient emails format.")
         
    # Fetch database metrics for email content
    crops_count = await crops_col.count_documents({})
    tasks_pending = await tasks_col.count_documents({"status": "Pending"})
    
    # Calculate some ledger summary
    cursor = finance_col.find()
    fin_entries = await cursor.to_list(100)
    total_income = sum(f.get("amount", 0) for f in fin_entries if f.get("type") == "income")
    total_expense = sum(f.get("amount", 0) for f in fin_entries if f.get("type") == "expense")
    net_profit = total_income - total_expense
    
    subject = "AgriFarm Command Center — Automated Scheduled Digest [IMMEDIATE]"
    html_content = f"""
    <div style="font-family: sans-serif; padding: 25px; background-color: #faf9f6; color: #1c1917; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #e2dfdb;">
        <h2 style="color: #165b33; border-bottom: 2px solid #165b33; padding-bottom: 10px; margin-top: 0;">Usman Agri Farm Digest</h2>
        <p style="font-size: 14px; line-height: 1.5; color: #44403c;">This is an immediate system-triggered automated report generated by the AgriFarm Command Scheduler.</p>
        
        <div style="background-color: #fdfdfb; border: 1px solid #e7e5dc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #14532d; margin-top: 0; font-size: 15px;">Operational Summary</h3>
            <p style="margin: 6px 0; font-size: 13px;"><strong>Total Crops Planted:</strong> {crops_count} sectors</p>
            <p style="margin: 6px 0; font-size: 13px;"><strong>Pending Care Assignments:</strong> {tasks_pending} duties</p>
            <p style="margin: 6px 0; font-size: 13px;"><strong>Direct Ledger Balance:</strong> <span style="color: { 'green' if net_profit >= 0 else 'red' };">${net_profit:,.2f}</span></p>
        </div>
        
        <p style="font-size: 11px; color: #78716c;">This transmission was authorized by {current_user.get("username")} and delivered instantly via AgriFarm Mailer.</p>
    </div>
    """
    
    # Send email to each recipient
    success_emails = []
    failed_emails = []
    for email in recipients:
         sent = await send_email(email, subject, html_content)
         if sent:
             success_emails.append(email)
         else:
             failed_emails.append(email)
             
    if not success_emails:
         raise HTTPException(
             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
             detail=f"Mailer failed to deliver to any of the recipients: {', '.join(failed_emails)}"
         )
         
    return {
        "status": "ok", 
        "message": f"Digest successfully dispatched to: {', '.join(success_emails)}",
        "failures": failed_emails
    }

# --- PASSWORD RESET FLOWS ---
@app.post("/forgot-password")
async def forgot_password(payload: dict):
    email = payload.get("email", "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Admin email is required")
    
    # Verify if admin with email exists
    admin = await users_col.find_one({"email": email, "role": "admin"})
    if not admin:
        raise HTTPException(status_code=404, detail="No administrator account with this email was found.")
    
    # Generate 6-digit code
    code = str(random.randint(100000, 999999))
    expiry = datetime.utcnow().timestamp() + 600 # 10 minutes
    
    await resets_col.delete_many({"email": email}) # clear previous
    await resets_col.insert_one({
        "email": email,
        "code": code,
        "expiry": expiry
    })
    
    # Send email
    subject = "AgriFarm Command Center — Verification Reset Code"
    html_content = f"""
    <div style="font-family: sans-serif; padding: 25px; background-color: #0b0f19; color: #f1f5f9; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #1e293b;">
        <h2 style="color: #22c55e; border-bottom: 1px solid #1e293b; padding-bottom: 10px; margin-top: 0;">AgriFarm Password Recovery</h2>
        <p style="font-size: 14px; line-height: 1.5; color: #94a3b8;">You requested an administrative password reset code. Use the verification code below to authorize your reset:</p>
        <div style="background-color: #1e293b; padding: 15px; border-radius: 8px; font-size: 26px; font-weight: bold; text-align: center; color: #22c55e; letter-spacing: 4px; margin: 20px 0; border: 1px solid #334155;">
            {code}
        </div>
        <p style="font-size: 11px; color: #64748b;">This code is strictly active for 10 minutes. If you did not authorize this action, secure your account immediately.</p>
    </div>
    """
    sent = await send_email(email, subject, html_content)
    if not sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SMTP service failed to deliver the verification code. Please check that SMTP credentials are configured correctly in the environment."
        )
    return {"status": "ok", "message": "Verification code has been successfully emailed!"}

@app.post("/reset-password")
async def reset_password(payload: dict):
    email = payload.get("email", "").lower().strip()
    code = payload.get("code", "").strip()
    new_password = payload.get("newPassword")
    
    if not email or not code or not new_password:
        raise HTTPException(status_code=400, detail="Email, code, and new password are required.")
    if len(new_password) < 4:
        raise HTTPException(status_code=400, detail="New password must be at least 4 characters.")
    
    # Verify code
    reset_record = await resets_col.find_one({"email": email, "code": code})
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid verification code.")
    
    # Check expiry
    if datetime.utcnow().timestamp() > reset_record["expiry"]:
        await resets_col.delete_one({"_id": reset_record["_id"]})
        raise HTTPException(status_code=400, detail="Verification code has expired.")
        
    # Reset password
    hashed_password = get_password_hash(new_password)
    await users_col.update_one({"email": email, "role": "admin"}, {"$set": {"password": hashed_password}})
    await resets_col.delete_one({"_id": reset_record["_id"]})
    return {"status": "ok"}

# --- USER MANAGEMENT ROUTES (ADMIN ONLY) ---
@app.get("/users")
async def get_users(skip: int = 0, limit: int = 100, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin authorization required")
    limit = min(limit, 100)
    users = await users_col.find().skip(skip).to_list(limit)
    for u in users:
        u["_id"] = str(u["_id"])
        if "password" in u:
            del u["password"]
    return users

@app.patch("/users/{user_id}/edit")
async def edit_worker_profile(user_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin authorization required")
        
    admin_password = payload.get("adminPassword")
    if not admin_password:
        raise HTTPException(status_code=400, detail="Administrator current password is required for confirmation")
        
    # Verify administrator's password
    if not verify_password(admin_password, current_user["password"]):
        raise HTTPException(status_code=401, detail="Administrator password is incorrect")
        
    new_username = payload.get("newUsername")
    new_password = payload.get("newPassword")
    
    try:
        obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
        
    updates = {}
    if new_username:
        new_username_clean = new_username.lower().strip()
        # Ensure it doesn't duplicate
        existing = await users_col.find_one({"username": new_username_clean, "_id": {"$ne": obj_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Username is already taken")
        updates["username"] = new_username_clean
        
    if new_password:
        if len(new_password) < 4:
            raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
        updates["password"] = get_password_hash(new_password)
        
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
        
    result = await users_col.update_one({"_id": obj_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {"status": "ok"}

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
async def get_crops(skip: int = 0, limit: int = 100, current_user: dict = Depends(get_current_user)):
    limit = min(limit, 100)
    data = await crops_col.find().skip(skip).to_list(limit)
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
async def get_finance(skip: int = 0, limit: int = 100, current_user: dict = Depends(get_current_user)):
    limit = min(limit, 100)
    data = await finance_col.find().skip(skip).to_list(limit)
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
async def get_tasks(skip: int = 0, limit: int = 100, current_user: dict = Depends(get_current_user)):
    limit = min(limit, 100)
    data = await tasks_col.find().skip(skip).to_list(limit)
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
