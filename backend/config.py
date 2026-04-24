import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/hedgetrack")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-in-production")
