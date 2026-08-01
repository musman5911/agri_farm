import motor.motor_asyncio
import os
from dotenv import load_dotenv
load_dotenv()
client = motor.motor_asyncio.AsyncIOMotorClient(os.getenv("MONGO_URI"))
db = client.farm_management
users_col = db.users
crops_col = db.crops
finance_col = db.finance