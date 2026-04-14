from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.services.tables_db import TablesDB
import os
from dotenv import load_dotenv

load_dotenv()

client = Client()
client.set_endpoint(os.getenv("APPWRITE_ENDPOINT"))
client.set_project(os.getenv("APPWRITE_PROJECT_ID"))
client.set_key(os.getenv("APPWRITE_API_KEY"))  # 🔥 SERVER KEY ONLY

databases = Databases(client)
tables_db = TablesDB(client)
