from google import genai
from config.settings import GEMINI_API_KEY
client = genai.Client(api_key=GEMINI_API_KEY)

def get_gemini_client():
    if not client:
        raise ValueError("Gemini client not initialized")
    return client


