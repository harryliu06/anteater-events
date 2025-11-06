from config.settings import GEMINI_API_KEY

def get_gemini_client():
    from google import genai
    client = genai.Client(api_key=GEMINI_API_KEY)
    if not client:
        raise ValueError("Gemini client not initialized")
    return client


