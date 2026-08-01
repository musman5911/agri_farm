import requests

API = "http://localhost:8000"

# 1. Add Realistic Crops
crops = [
    {"name": "Premium Wheat", "status": "Growing"},
    {"name": "Organic Corn", "status": "Harvesting"},
    {"name": "Golden Potatoes", "status": "Planted"},
    {"name": "Fresh Tomatoes", "status": "Growing"}
]

# 2. Add Realistic Finance Logs
finance = [
    {"category": "Fertilizer Purchase", "amount": 450, "type": "expense"},
    {"category": "Worker Salaries", "amount": 1200, "type": "expense"},
    {"category": "Wheat Sale (Batch A)", "amount": 3500, "type": "income"},
    {"category": "Tractor Fuel", "amount": 150, "type": "expense"},
    {"category": "Corn Sale", "amount": 2800, "type": "income"}
]

# 3. Add Realistic Tasks
tasks = [
    {"title": "Irrigate North Plot"},
    {"title": "Repair Fence near Well"},
    {"title": "Check Soil pH level"},
    {"title": "Apply Organic Pesticide"}
]

print("🚀 Injecting data into your Farm System...")

for c in crops:
    requests.post(f"{API}/crops", json=c)
for f in finance:
    requests.post(f"{API}/finance", json=f)
for t in tasks:
    requests.post(f"{API}/tasks", json=t)

print("✅ DONE! Refresh your browser at http://localhost:5173 to see the data.")