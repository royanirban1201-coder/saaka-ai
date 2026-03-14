from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

client = MongoClient(os.getenv("MONGODB_URI"))
db = client["sakaa"]

# Collections
users_col       = db["users"]
contracts_col   = db["contracts"]
milestones_col  = db["milestones"]
wallets_col     = db["wallets"]
pfi_col         = db["pfi"]
domains_col     = db["domains"]
tenders_col     = db["tenders"]
offers_col      = db["offers"]
messages_col    = db["messages"]
disputes_col    = db["disputes"]
transactions_col = db["transactions"]

# Indexes
users_col.create_index("email", unique=True)
contracts_col.create_index("employer_id")
contracts_col.create_index("freelancer_id")
milestones_col.create_index("contract_id")
wallets_col.create_index([("freelancer_id", 1), ("contract_id", 1)])
offers_col.create_index("freelancer_id")
tenders_col.create_index("employer_id")
