from fastapi import FastAPI, HTTPException, Depends, status, Request
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime
from bson import ObjectId
import os
import random
import asyncio
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

@app.middleware("http")
async def strip_api_prefix(request: Request, call_next):
    path = request.url.path
    if path.startswith("/api/"):
        request.scope["path"] = path[4:]
    elif path == "/api":
        request.scope["path"] = "/"
    response = await call_next(request)
    return response

# --- STARTUP EVENT — VERIFY DATABASE CONNECTION ---
def is_time_to_run(schedule: str, last_run_ts: float, now: datetime) -> bool:
    """Evaluate if the scheduled time has arrived and hasn't already executed on the calendar day."""
    if not last_run_ts:
        return True  # never run before, trigger immediately as an initial status check!
        
    last_run_dt = datetime.fromtimestamp(last_run_ts)
    
    # Simple, highly portable schedule interval logic
    if schedule == "0 8 * * *":  # Daily
        if now.date() > last_run_dt.date() and now.hour >= 8:
            return True
    elif schedule == "0 8 * * 0":  # Weekly (Sunday)
        if now.weekday() == 6 and now.date() > last_run_dt.date() and now.hour >= 8:
            return True
    elif schedule == "0 8 1 * *":  # Monthly (1st of month)
        if now.day == 1 and now.date() > last_run_dt.date() and now.hour >= 8:
            return True
    return False

async def build_and_send_automation_digest(recipient_emails_str: str) -> bool:
    """Default fall-back automated report dispatcher."""
    return await build_and_send_custom_digest(recipient_emails_str)

async def build_and_send_custom_digest(
    recipient_emails_str: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    all_fields: bool = True,
    include_crops: bool = True,
    include_finance: bool = True,
    include_tasks: bool = True
) -> bool:
    """Compiles a highly-customized email performance statement filtered by date-ranges and optional fields."""
    recipients = [r.strip() for r in recipient_emails_str.split(",") if r.strip()]
    if not recipients:
        return False
        
    # Build query filters for dates
    date_filter = {}
    if start_date or end_date:
        date_filter = {}
        if start_date:
            date_filter["$gte"] = start_date
        if end_date:
            date_filter["$lte"] = end_date

    # Fetch database metrics with dynamic range filters
    crops_query = {"plant_date": date_filter} if (start_date or end_date) else {}
    crops_list = await crops_col.find(crops_query).to_list(100) if include_crops or all_fields else []
    
    tasks_query = {"due_date": date_filter} if (start_date or end_date) else {}
    tasks_list = await tasks_col.find(tasks_query).to_list(100) if include_tasks or all_fields else []
    
    # Aggregate ledgers over all matching range entries
    finance_query = {"date": date_filter} if (start_date or end_date) else {}
    total_income = 0.0
    total_expense = 0.0
    fin_entries = []
    
    cursor = finance_col.find(finance_query)
    async for f in cursor:
        amount = f.get("amount", 0.0)
        if f.get("type") == "income":
            total_income += amount
        elif f.get("type") == "expense":
            total_expense += amount
        fin_entries.append(f)
        
    net_profit = total_income - total_expense
    
    # Construct the personalized email sections
    summary_html = f"""
    <div style="background-color: #f4faf5; border: 1px solid #ccd9c5; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <h3 style="color: #0b331c; margin-top: 0; margin-bottom: 15px; font-size: 15px; font-weight: 800; border-bottom: 1px solid #ccd9c5; padding-bottom: 8px;">
            💰 Operational Financials Overview
        </h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; font-size: 13px;">
            <tr>
                <td style="padding: 6px 0; color: #55534e;"><strong>Total Income:</strong></td>
                <td style="padding: 6px 0; text-align: right; color: #165b33; font-weight: bold;">${total_income:,.2f}</td>
            </tr>
            <tr>
                <td style="padding: 6px 0; color: #55534e;"><strong>Total Expense:</strong></td>
                <td style="padding: 6px 0; text-align: right; color: #dc2626; font-weight: bold;">${total_expense:,.2f}</td>
            </tr>
            <tr style="border-top: 1px solid #ccd9c5;">
                <td style="padding: 10px 0 0 0; color: #0b331c; font-weight: 800;"><strong>Net Ledger Balance:</strong></td>
                <td style="padding: 10px 0 0 0; text-align: right; color: { '#16a34a' if net_profit >= 0 else '#dc2626' }; font-weight: 900; font-size: 14px;">${net_profit:,.2f}</td>
            </tr>
        </table>
    </div>
    """ if include_finance or all_fields else ""

    crops_html = ""
    if (include_crops or all_fields) and crops_list:
        crops_rows = "".join([f"""
        <div style="background-color: #ffffff; border: 1px solid #ccd9c5; padding: 10px 14px; border-radius: 8px; margin-bottom: 6px; display: block; overflow: hidden;">
            <div style="font-size: 13px; color: #1c1917; font-weight: bold; float: left;">{c.get('name')} <span style="font-size: 11px; color: #66645e; font-weight: normal;">({c.get('variety', 'Standard')})</span></div>
            <div style="font-size: 10px; font-weight: bold; color: #116b35; background-color: #eaf5e7; padding: 1px 6px; border-radius: 10px; border: 1px solid #ccd9c5; text-transform: uppercase; float: right;">{c.get('status')}</div>
            <div style="clear: both; font-size: 11px; color: #7a837e; margin-top: 4px;">Sector Plot: <strong>{c.get('field', 'General')}</strong></div>
        </div>
        """ for c in crops_list])
        crops_html = f"""
        <div style="margin: 20px 0;">
            <h3 style="color: #0b331c; font-size: 15px; font-weight: 800; margin-bottom: 12px;">🌱 Planted Crops Cycle</h3>
            {crops_rows}
        </div>
        """

    tasks_html = ""
    if (include_tasks or all_fields) and tasks_list:
        tasks_rows = "".join([f"""
        <div style="background-color: #ffffff; border: 1px solid #ccd9c5; padding: 10px 14px; border-radius: 8px; margin-bottom: 6px;">
            <div style="display: block; overflow: hidden; margin-bottom: 4px;">
                <div style="font-size: 13px; font-weight: bold; color: #1c1917; float: left;">{t.get('title')}</div>
                <div style="font-size: 9px; font-weight: bold; color: { '#ef4444' if t.get('priority') == 'High' else '#165b33' }; text-transform: uppercase; background-color: { '#fef2f2' if t.get('priority') == 'High' else '#f4faf5' }; padding: 1px 6px; border-radius: 4px; border: 1px solid { '#fecaca' if t.get('priority') == 'High' else '#ccd9c5' }; float: right;">{t.get('priority')}</div>
            </div>
            <div style="font-size: 11px; color: #7a837e; margin-top: 4px;">Due Date: <strong>{t.get('due_date', 'N/A')}</strong> • Status: <strong>{t.get('status')}</strong></div>
        </div>
        """ for t in tasks_list])
        tasks_html = f"""
        <div style="margin: 20px 0;">
            <h3 style="color: #0b331c; font-size: 15px; font-weight: 800; margin-bottom: 12px;">📋 Scheduled Care Rosters</h3>
            {tasks_rows}
        </div>
        """

    range_msg = f"filtered from <strong>{start_date}</strong> to <strong>{end_date}</strong>" if (start_date or end_date) else "compiled from lifetime records"
    subject = "AgriFarm Command Center — Scheduled Operations Report"
    html_content = f"""
    <table align="center" width="550" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border-radius: 16px; overflow: hidden; border: 1px solid #ccd9c5;">
      <tr>
        <td style="background-color: #0b331c; padding: 30px 20px; text-align: center; border-bottom: 3px solid #c0a060;">
            <img src="https://raw.githubusercontent.com/musman5911/agri_farm/main/frontend/public/logo.png" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid #c0a060; object-fit: cover; background: #ffffff;" alt="Usman Agri Farm Logo" />
            <h1 style="color: #ffffff; font-size: 24px; margin: 12px 0 0 0; font-weight: 800; letter-spacing: -0.5px; font-family: sans-serif;">Usman Agri Farm</h1>
            <p style="font-size: 11px; text-transform: uppercase; color: #a3ccb1; letter-spacing: 2px; margin: 6px 0 0 0; font-weight: bold; font-family: sans-serif;">Advanced Crop Management</p>
        </td>
      </tr>
      <tr>
        <td style="background-color: #faf9f6; padding: 30px; font-family: sans-serif; color: #1c1917;">
            <h2 style="color: #116b35; border-bottom: 1px solid #ccd9c5; padding-bottom: 10px; margin-top: 0; font-size: 18px; font-weight: 800;">Custom Performance Report</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #44403c;">This is your customized operational performance statement {range_msg}.</p>
            
            {summary_html}
            {crops_html}
            {tasks_html}
            
            <p style="font-size: 11px; color: #78716c; line-height: 1.5; border-top: 1px solid #ccd9c5; padding-top: 15px; margin-top: 25px; text-align: center;">This custom report was compiled dynamically and dispatched via your Usman Agri Farm Mailer node.</p>
        </td>
      </tr>
    </table>
    """
    
    success = False
    for email in recipients:
        sent = await send_email(email, subject, html_content)
        if sent:
            success = True
    return success

async def run_automation_scheduler():
    """Real, background asyncio scheduler engine enforcing daily/weekly/monthly cron settings."""
    print("⏰ [Cron Engine] Background scheduler engine initialized and monitoring triggers.")
    while True:
        try:
            await asyncio.sleep(60)  # check rules every 60 seconds
            settings = await db.settings.find_one({"key": "automations"})
            if settings:
                value = settings.get("value", {})
                if value.get("cron_enabled"):
                    schedule = value.get("schedule", "0 8 * * *")
                    recipient = value.get("recipient", "")
                    last_run_ts = value.get("last_run", 0.0)
                    
                    now = datetime.utcnow()
                    if is_time_to_run(schedule, last_run_ts, now):
                        print(f"⏰ [Cron Engine] Executing scheduled report cycle for {recipient}...")
                        sent = await build_and_send_automation_digest(recipient)
                        if sent:
                            value["last_run"] = now.timestamp()
                            await db.settings.update_one(
                                {"key": "automations"},
                                {"$set": {"value": value}}
                            )
                            print(f"⏰ [Cron Engine] Report cycle successfully completed. Next run scheduled.")
                        else:
                            print(f"⚠️ [Cron Engine] Failed to dispatch scheduled report email.")
        except Exception as e:
            print(f"⚠️ [Cron Engine] Background scheduler loop issue: {e}")

@app.on_event("startup")
async def verify_db_connection():
    # Start the continuous background scheduler task
    asyncio.create_task(run_automation_scheduler())
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
@app.get("/health")
async def root():
    return {"message": "Welcome to AgriFarm Management API!"}

# --- SETUP CHECK ROUTE ---
@app.get("/check-setup")
async def check_setup():
    from database import use_mock
    count = await users_col.count_documents({})
    return {"setup_done": count > 0, "is_mock": use_mock}

# --- RATE LIMITING ENGINE ---
from datetime import datetime, timedelta

login_rate_limit_history = {}  # host -> list of datetime timestamps

def check_rate_limit(request: Request, limit: int = 10, window_secs: int = 300):
    host = request.client.host if request.client else "unknown"
    now = datetime.utcnow()
    
    if host not in login_rate_limit_history:
        login_rate_limit_history[host] = []
        
    # Keep only timestamps within the rolling window
    cutoff = now - timedelta(seconds=window_secs)
    login_rate_limit_history[host] = [t for t in login_rate_limit_history[host] if t > cutoff]
    
    if len(login_rate_limit_history[host]) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many request attempts. Please wait 5 minutes before trying again."
        )
    
    login_rate_limit_history[host].append(now)

# --- AUTH ROUTES ---
@app.post("/signup", status_code=status.HTTP_201_CREATED, response_model=UserOut)
async def signup(request: Request, user: User, current_user: Optional[dict] = Depends(get_current_user_optional)):
    check_rate_limit(request)
    user_count = await users_col.count_documents({})
    if user_count > 0:
        if not current_user or current_user.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Registration is restricted to Administrators only."
            )

    clean_email = user.email.lower().strip() if user.email else ""
    clean_username = user.username.lower().strip()

    if len(user.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

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
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    check_rate_limit(request)
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
    
    if not new_password:
        raise HTTPException(status_code=400, detail="New password is required.")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long.")
        
    if code:
        # Verify email code
        current_email = current_user.get("email", "")
        reset_record = await resets_col.find_one({"email": current_email, "code": code})
        if not reset_record or reset_record.get("expiry", 0) < datetime.utcnow().timestamp():
            raise HTTPException(status_code=400, detail="Invalid or expired verification code.")
        # Clear code
        await resets_col.delete_many({"email": current_email})
    elif current_password:
        # Verify current password
        if not verify_password(current_password, current_user["password"]):
            raise HTTPException(status_code=401, detail="Current password is incorrect.")
    else:
        raise HTTPException(status_code=400, detail="Either current password or verification code is required.")
    
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
    <table align="center" width="550" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border-radius: 16px; overflow: hidden; border: 1px solid #ccd9c5;">
      <tr>
        <td style="background-color: #0b331c; padding: 30px 20px; text-align: center; border-bottom: 3px solid #c0a060;">
            <img src="https://raw.githubusercontent.com/musman5911/agri_farm/main/frontend/public/logo.png" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid #c0a060; object-fit: cover; background: #ffffff;" alt="Usman Agri Farm Logo" />
            <h1 style="color: #ffffff; font-size: 24px; margin: 12px 0 0 0; font-weight: 800; letter-spacing: -0.5px; font-family: sans-serif;">Usman Agri Farm</h1>
            <p style="font-size: 11px; text-transform: uppercase; color: #a3ccb1; letter-spacing: 2px; margin: 6px 0 0 0; font-weight: bold; font-family: sans-serif;">Advanced Crop Management</p>
        </td>
      </tr>
      <tr>
        <td style="background-color: #faf9f6; padding: 30px; font-family: sans-serif; color: #1c1917;">
            <h2 style="color: #116b35; border-bottom: 1px solid #ccd9c5; padding-bottom: 10px; margin-top: 0; font-size: 18px; font-weight: 800;">Secure Profile Authorization</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #44403c;">You requested an administrative authorization code to update your profile (email or password). Use the code below to complete this action:</p>
            
            <div style="background-color: #f4faf5; border: 2px dashed #116b35; padding: 25px 20px; border-radius: 12px; margin: 25px 0; text-align: center; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
                <p style="margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; color: #15803d; letter-spacing: 1.5px; font-weight: bold;">Your Secure Verification Code</p>
                <div style="font-size: 36px; font-weight: 900; color: #0b331c; letter-spacing: 8px; font-family: monospace; line-height: 1;">
                    {code}
                </div>
            </div>
            
            <p style="font-size: 11px; line-height: 1.5; color: #78716c; text-align: center; border-top: 1px solid #ccd9c5; padding-top: 15px; margin-top: 25px;">This code is active strictly for 10 minutes. If you did not authorize this action, please secure your credentials immediately.</p>
        </td>
      </tr>
    </table>
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
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin authorization required")
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

@app.get("/summary/today")
async def get_today_summary(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin authorization required")
        
    crops_count = await crops_col.count_documents({})
    growing = await crops_col.count_documents({"status": "Growing"})
    harvesting = await crops_col.count_documents({"status": "Harvesting"})
    planted = await crops_col.count_documents({"status": "Planted"})
    tasks_pending = await tasks_col.count_documents({"status": "Pending"})
    
    # Calculate ledger
    total_income = 0.0
    total_expense = 0.0
    cursor = finance_col.find()
    async for f in cursor:
        amount = f.get("amount", 0.0)
        if f.get("type") == "income":
            total_income += amount
        elif f.get("type") == "expense":
            total_expense += amount
    net_profit = total_income - total_expense
    
    today_str = datetime.utcnow().strftime("%b %d, %Y")
    summary_text = (
        f"🌱 Usman AgriFarm Daily Summary — {today_str}\n\n"
        f"Crops Planted: {crops_count} ({growing} growing, {harvesting} harvesting, {planted} planted)\n"
        f"Pending Duties: {tasks_pending}\n"
        f"Net Profit: ${net_profit:,.2f}"
    )
    return {"summary_text": summary_text}

@app.post("/summary/today/email")
async def email_today_summary(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin authorization required")
        
    email = current_user.get("email", "")
    if not email:
        raise HTTPException(status_code=400, detail="No email address is registered on this account to deliver the summary statement.")
        
    sent = await build_and_send_automation_digest(email)
    if not sent:
        raise HTTPException(status_code=500, detail="Mailer failed to deliver the operational summary statement.")
    return {"status": "ok", "message": f"Daily Performance statement successfully dispatched to: {email}"}

@app.put("/settings/automations")
async def save_automations(payload: dict, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin authorization required")
    await db.settings.update_one(
        {"key": "automations"},
        {"$set": {"value": payload}},
        upsert=True
    )
    return {"status": "ok"}

class TriggerPayload(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    all_fields: bool = True
    include_crops: bool = True
    include_finance: bool = True
    include_tasks: bool = True

@app.post("/settings/automations/trigger")
async def trigger_automations(payload: TriggerPayload, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin authorization required")
    settings = await db.settings.find_one({"key": "automations"})
    if not settings:
        raise HTTPException(status_code=400, detail="Automation settings must be configured and saved first.")
    
    settings_data = settings["value"]
    recipients_str = settings_data.get("recipient", "").strip()
    if not recipients_str:
        raise HTTPException(status_code=400, detail="No recipient emails are configured in your automation rules.")
        
    sent = await build_and_send_custom_digest(
        recipient_emails_str=recipients_str,
        start_date=payload.start_date,
        end_date=payload.end_date,
        all_fields=payload.all_fields,
        include_crops=payload.include_crops,
        include_finance=payload.include_finance,
        include_tasks=payload.include_tasks
    )
    if not sent:
         raise HTTPException(
             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
             detail="Mailer failed to deliver the automated report."
         )
         
    settings_data["last_run"] = datetime.utcnow().timestamp()
    await db.settings.update_one(
        {"key": "automations"},
        {"$set": {"value": settings_data}}
    )
    return {
        "status": "ok", 
        "message": f"Custom report successfully dispatched to: {recipients_str}"
    }

# --- PASSWORD RESET FLOWS ---
@app.post("/forgot-password")
async def forgot_password(request: Request, payload: dict):
    check_rate_limit(request)
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
    <table align="center" width="550" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border-radius: 16px; overflow: hidden; border: 1px solid #ccd9c5;">
      <tr>
        <td style="background-color: #0b331c; padding: 30px 20px; text-align: center; border-bottom: 3px solid #c0a060;">
            <img src="https://raw.githubusercontent.com/musman5911/agri_farm/main/frontend/public/logo.png" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid #c0a060; object-fit: cover; background: #ffffff;" alt="Usman Agri Farm Logo" />
            <h1 style="color: #ffffff; font-size: 24px; margin: 12px 0 0 0; font-weight: 800; letter-spacing: -0.5px; font-family: sans-serif;">Usman Agri Farm</h1>
            <p style="font-size: 11px; text-transform: uppercase; color: #a3ccb1; letter-spacing: 2px; margin: 6px 0 0 0; font-weight: bold; font-family: sans-serif;">Advanced Crop Management</p>
        </td>
      </tr>
      <tr>
        <td style="background-color: #faf9f6; padding: 30px; font-family: sans-serif; color: #1c1917;">
            <h2 style="color: #116b35; border-bottom: 1px solid #ccd9c5; padding-bottom: 10px; margin-top: 0; font-size: 18px; font-weight: 800;">Account Password Recovery</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #44403c;">We received a request to recover your administrator account password. Please enter the verification recovery code below to authorize your reset:</p>
            
            <div style="background-color: #f4faf5; border: 2px dashed #116b35; padding: 25px 20px; border-radius: 12px; margin: 25px 0; text-align: center; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
                <p style="margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; color: #15803d; letter-spacing: 1.5px; font-weight: bold;">Your Secure Verification Code</p>
                <div style="font-size: 36px; font-weight: 900; color: #0b331c; letter-spacing: 8px; font-family: monospace; line-height: 1;">
                    {code}
                </div>
            </div>
            
            <p style="font-size: 11px; line-height: 1.5; color: #78716c; text-align: center; border-top: 1px solid #ccd9c5; padding-top: 15px; margin-top: 25px;">This code is active strictly for 10 minutes. If you did not authorize this action, please secure your credentials immediately.</p>
        </td>
      </tr>
    </table>
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
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long.")
    
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
        if len(new_password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")
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

# --- SERVE FRONTEND STATIC FILES IN PRODUCTION ---
from fastapi.staticfiles import StaticFiles

frontend_dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend/dist"))
if os.path.exists(frontend_dist_path):
    app.mount("/", StaticFiles(directory=frontend_dist_path, html=True), name="frontend")
else:
    print(f"⚠️ [Startup] Warning: Frontend build dist folder was not found at {frontend_dist_path}. Please compile with 'npm run build' in frontend/.")
