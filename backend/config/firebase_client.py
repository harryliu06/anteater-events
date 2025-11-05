import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
from pathlib import Path
import os

env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(env_path)




if not firebase_admin._apps:
    firebase_json_path = Path(os.getenv('firebase_json_path')).resolve()
    cred = credentials.Certificate(firebase_json_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()

