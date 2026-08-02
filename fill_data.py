import sys
import requests

API = "http://localhost:8000"

print("=" * 60)
print("🚜  AgriFarm Management System — Database Seeder")
print("=" * 60)

# --- STEP 1: VERIFY SERVER IS RUNNING ---
print("🔍 Checking if AgriFarm Backend Server is running...")
try:
    response = requests.get(API, timeout=4)
    print("✅ Backend server is alive and responding!")
except (requests.exceptions.ConnectionError, requests.exceptions.Timeout):
    print("\n❌ CONNECTION ERROR: The backend server is NOT running on http://localhost:8000!")
    print("   Please start your FastAPI server before running the seeder.")
    print("\n💡 HOW TO START THE BACKEND SERVER:")
    print("   1. Open a new terminal window / tab.")
    print("   2. Navigate to your backend directory:")
    print("      cd backend")
    print("   3. Start the server using uvicorn:")
    print("      uvicorn main:app --reload --port 8000")
    print("   4. Once started, keep it running and execute this script again.")
    print("=" * 60)
    sys.exit(1)
except Exception as e:
    print(f"⚠️ Warning: Non-standard connection check issue: {e}")

# --- STEP 2: USER CREATION & JWT AUTHENTICATION ---
default_user = {
    "username": "admin",
    "email": "admin@farm.com",
    "role": "admin",
    "password": "adminpassword123"
}

print("\n🔑 Authenticating with server...")

# Try to signup the user
try:
    signup_res = requests.post(f"{API}/signup", json=default_user, timeout=5)
    if signup_res.status_code == 201:
        print("   ✅ Default admin account created.")
    elif signup_res.status_code == 400:
        # User already exists, which is fine
        print("   ℹ️ Admin account already exists (skipping registration).")
    else:
        print(f"   ⚠️ Signup warning: HTTP {signup_res.status_code} - {signup_res.text}")
except Exception as e:
    # If signup failed, it might be because MongoDB is disconnected. Let's test that below.
    if "Connection refused" in str(e) or "Timeout" in str(e):
        pass
    else:
        print(f"   ⚠️ Signup skipped: {e}")

# Log in to retrieve JWT access token
token = None
try:
    login_data = {
        "username": default_user["email"],
        "password": default_user["password"]
    }
    login_res = requests.post(f"{API}/login", data=login_data, timeout=5)
    if login_res.status_code == 200:
        token = login_res.json()["access_token"]
        print("   ✅ Access Token acquired successfully!")
    else:
        print("\n   ℹ️ Default admin login failed (your database already has a custom administrator).")
        print("   👉 Let's log in with your custom registered Administrator credentials instead!")
        try:
            custom_email = input("   ✉️ Enter your Admin Email/Username: ").strip()
            custom_password = input("   🔑 Enter your Admin Password: ").strip()
            
            login_data = {
                "username": custom_email,
                "password": custom_password
            }
            login_res = requests.post(f"{API}/login", data=login_data, timeout=5)
            if login_res.status_code == 200:
                token = login_res.json()["access_token"]
                print("   ✅ Access Token acquired successfully!")
            else:
                detail = login_res.json().get('detail')
                print(f"   ❌ Custom login failed (HTTP {login_res.status_code}): {detail}")
        except KeyboardInterrupt:
            print("\n   Seeding canceled.")
            sys.exit(0)
except Exception as e:
    # Check if the error is likely due to MongoDB connection timeout
    print(f"   ❌ Authentication failed: {e}")

if not token:
    print("\n❌ CRITICAL: Could not acquire authentication token.")
    print("   This usually happens if your backend cannot connect to MongoDB.")
    print("\n💡 DATABASE TROUBLESHOOTING:")
    print("   - Please check your backend terminal for database connection errors.")
    print("   - Make sure your MongoDB service is running locally (`brew services start mongodb-community` or `sudo systemctl start mongod`).")
    print("   - Or, make sure the `MONGO_URI` inside `backend/.env` points to a valid local or MongoDB Atlas cluster.")
    print("=" * 60)
    sys.exit(1)

headers = {
    "Authorization": f"Bearer {token}"
}

# --- STEP 3: SEEDING DATA ---
crops = [
    {"name": "Premium Wheat", "status": "Growing"},
    {"name": "Organic Corn", "status": "Harvesting"},
    {"name": "Golden Potatoes", "status": "Planted"},
    {"name": "Fresh Tomatoes", "status": "Growing"}
]

finance = [
    {"category": "Fertilizer Purchase", "amount": 450, "type": "expense"},
    {"category": "Worker Salaries", "amount": 1200, "type": "expense"},
    {"category": "Wheat Sale (Batch A)", "amount": 3500, "type": "income"},
    {"category": "Tractor Fuel", "amount": 150, "type": "expense"},
    {"category": "Corn Sale", "amount": 2800, "type": "income"}
]

tasks = [
    {"title": "Irrigate North Plot"},
    {"title": "Repair Fence near Well"},
    {"title": "Check Soil pH level"},
    {"title": "Apply Organic Pesticide"}
]

print("\n🚀 Injecting data into your Farm System...")

success_count = 0
total_items = len(crops) + len(finance) + len(tasks)

for c in crops:
    try:
        res = requests.post(f"{API}/crops", json=c, headers=headers, timeout=5)
        if res.status_code == 201:
            success_count += 1
        else:
            print(f"   ⚠️ Failed to seed crop {c['name']}: {res.text}")
    except Exception as e:
        print(f"   ❌ Error seeding crop: {e}")

for f in finance:
    try:
        res = requests.post(f"{API}/finance", json=f, headers=headers, timeout=5)
        if res.status_code == 201:
            success_count += 1
        else:
            print(f"   ⚠️ Failed to seed finance log {f['category']}: {res.text}")
    except Exception as e:
        print(f"   ❌ Error seeding finance log: {e}")

for t in tasks:
    try:
        res = requests.post(f"{API}/tasks", json=t, headers=headers, timeout=5)
        if res.status_code == 201:
            success_count += 1
        else:
            print(f"   ⚠️ Failed to seed task {t['title']}: {res.text}")
    except Exception as e:
        print(f"   ❌ Error seeding task: {e}")

print("\n" + "=" * 60)
if success_count == total_items:
    print("🎉 SUCCESS: All items seeded successfully!")
    print("   Refresh your browser at http://localhost:5173 to view the data.")
else:
    print(f"⚠️ SEED COMPLETED WITH WARNINGS: {success_count}/{total_items} items seeded.")
    print("   Please check your MongoDB connection or environment config.")
print("=" * 60)
