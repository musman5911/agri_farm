import pymongo
import motor.motor_asyncio
import os
from dotenv import load_dotenv

load_dotenv()

mongo_uri = os.getenv("MONGO_URI") or "mongodb://localhost:27017"
if mongo_uri.startswith("mongodb+srv://admin:admin123@cluster0.xxxxx.mongodb.net"):
    print("⚠️ MONGO_URI in .env appears to be a placeholder. Falling back to local MongoDB.")
    mongo_uri = "mongodb://localhost:27017"

use_mock = False
try:
    # Try to connect synchronously to see if MongoDB is alive
    check_client = pymongo.MongoClient(mongo_uri, serverSelectionTimeoutMS=800)
    check_client.server_info()  # triggers connection attempt
    print("🔌 [Database] Connected successfully to real MongoDB server.")
except Exception as e:
    print(f"⚠️ [Database] Could not connect to MongoDB ({e}). Falling back to in-memory mongomock.")
    use_mock = True

if use_mock:
    from mongomock_motor import AsyncMongoMockClient
    client = AsyncMongoMockClient()
else:
    client = motor.motor_asyncio.AsyncIOMotorClient(mongo_uri)

db = client.farm_management
users_col = db.users
crops_col = db.crops
finance_col = db.finance
tasks_col = db.tasks
resets_col = db.resets
