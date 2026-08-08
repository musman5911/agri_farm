import pymongo
import pymongo.uri_parser
import motor.motor_asyncio
import os
from dotenv import load_dotenv

# Load local .env, but do NOT override already defined system-level Replit Secrets!
load_dotenv(override=False)

# Read the connection URI (prioritizing Replit Secrets)
mongo_uri = os.getenv("MONGO_URI") or "mongodb://localhost:27017/farm_management"

# Safely check if it's the default dummy template placeholder
if "cluster0.xxxxx.mongodb.net" in mongo_uri:
    print("⚠️ [Database] MONGO_URI in .env is a template placeholder. Falling back to local MongoDB.")
    mongo_uri = "mongodb://localhost:27017/farm_management"

# Parse database name from MONGO_URI connection string dynamically
db_name = "farm_management"
host_name = "localhost"
try:
    parsed_uri = pymongo.uri_parser.parse_uri(mongo_uri)
    if parsed_uri.get("database"):
        db_name = parsed_uri["database"]
    if parsed_uri.get("nodelist"):
        host_name = parsed_uri["nodelist"][0][0]
except Exception:
    pass

print(f"🔌 [Database] Connection target resolved: Host '{host_name}' | Database '{db_name}'")

use_mock = False
try:
    # Use a higher timeout for remote Atlas cloud connections, and shorter for local
    timeout_ms = 5000 if mongo_uri.startswith("mongodb+srv://") else 1500
    
    # Try to connect synchronously to see if MongoDB is alive
    check_client = pymongo.MongoClient(mongo_uri, serverSelectionTimeoutMS=timeout_ms)
    check_client.server_info()  # triggers connection attempt
    print(f"🔌 [Database] Connected successfully to real MongoDB server. Database in use: '{db_name}'")
except Exception as e:
    print(f"⚠️ [Database] Could not connect to MongoDB ({e}). Falling back to in-memory mongomock. Database mock: '{db_name}'")
    use_mock = True

if use_mock:
    from mongomock_motor import AsyncMongoMockClient
    client = AsyncMongoMockClient()
else:
    client = motor.motor_asyncio.AsyncIOMotorClient(mongo_uri)

db = client[db_name]
users_col = db.users
crops_col = db.crops
finance_col = db.finance
tasks_col = db.tasks
resets_col = db.resets
