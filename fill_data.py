import requests

API = "http://localhost:8000"

# 1. Create Default Admin User
default_user = {
    "username": "admin",
    "email": "admin@farm.com",
    "role": "admin",
    "password": "adminpassword123"
}

print("🔑 Creating / Logging in default admin user...")

# Try to signup the user
try:
    signup_res = requests.post(f"{API}/signup", json=default_user)
    if signup_res.status_code == 201:
        print("✅ Default admin user created successfully.")
    else:
        print(f"ℹ️ Admin user signup response: {signup_res.json().get('detail')}")
except Exception as e:
    print(f"⚠️ Signup failed or skipped (may already exist): {e}")

# Log in to retrieve JWT access token
token = None
try:
    login_data = {
        "username": default_user["email"],
        "password": default_user["password"]
    }
    login_res = requests.post(f"{API}/login", data=login_data)
    if login_res.status_code == 200:
        token = login_res.json()["access_token"]
        print("✅ Logged in successfully. Token acquired!")
    else:
        print(f"❌ Login failed: {login_res.json().get('detail')}")
except Exception as e:
    print(f"❌ Failed to login: {e}")

if not token:
    print("❌ Could not acquire authentication token. Aborting seed script.")
    exit(1)

headers = {
    "Authorization": f"Bearer {token}"
}

# 2. Add Realistic Crops
crops = [
    {"name": "Premium Wheat", "status": "Growing"},
    {"name": "Organic Corn", "status": "Harvesting"},
    {"name": "Golden Potatoes", "status": "Planted"},
    {"name": "Fresh Tomatoes", "status": "Growing"}
]

# 3. Add Realistic Finance Logs
finance = [
    {"category": "Fertilizer Purchase", "amount": 450, "type": "expense"},
    {"category": "Worker Salaries", "amount": 1200, "type": "expense"},
    {"category": "Wheat Sale (Batch A)", "amount": 3500, "type": "income"},
    {"category": "Tractor Fuel", "amount": 150, "type": "expense"},
    {"category": "Corn Sale", "amount": 2800, "type": "income"}
]

# 4. Add Realistic Tasks
tasks = [
    {"title": "Irrigate North Plot"},
    {"title": "Repair Fence near Well"},
    {"title": "Check Soil pH level"},
    {"title": "Apply Organic Pesticide"}
]

print("🚀 Injecting authenticated data into your Farm System...")

for c in crops:
    res = requests.post(f"{API}/crops", json=c, headers=headers)
    if res.status_code != 201:
        print(f"⚠️ Failed to add crop {c['name']}: {res.text}")
for f in finance:
    res = requests.post(f"{API}/finance", json=f, headers=headers)
    if res.status_code != 201:
        print(f"⚠️ Failed to add finance entry {f['category']}: {res.text}")
for t in tasks:
    res = requests.post(f"{API}/tasks", json=t, headers=headers)
    if res.status_code != 201:
        print(f"⚠️ Failed to add task {t['title']}: {res.text}")

print("✅ DONE! Refresh your browser at http://localhost:5173 to see the data.")
