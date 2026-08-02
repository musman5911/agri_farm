import motor.motor_asyncio
import os
from dotenv import load_dotenv

load_dotenv()

mongo_uri = os.getenv("MONGO_URI") or "mongodb://localhost:27017"
if mongo_uri.startswith("mongodb+srv://admin:admin123@cluster0.xxxxx.mongodb.net"):
    # This is a dummy URL from the user's template. We should fallback to a local MongoDB
    # or handle the exception gracefully so development server doesn't crash on start.
    print("⚠️ MONGO_URI in .env appears to be a placeholder. Falling back to local MongoDB.")
    mongo_uri = "mongodb://localhost:27017"

client = motor.motor_asyncio.AsyncIOMotorClient(mongo_uri)
db = client.farm_management
users_col = db.users
crops_col = db.crops
finance_col = db.finance
tasks_col = db.tasks
resets_col = db.resets
