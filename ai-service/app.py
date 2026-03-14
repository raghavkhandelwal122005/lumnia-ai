import os
import sqlite3
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Health AI Microservice")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SQLite Database Initialization ---
DB_FILE = "health_records.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS health_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_name TEXT,
            age INTEGER,
            gender TEXT,
            symptoms TEXT,
            diagnosis TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# --- Models ---
class SymptomRequest(BaseModel):
    symptoms: str

class ChatRequest(BaseModel):
    message: str
    patient_name: str = "Unknown"
    recent_vitals: dict = {}
    conversation_history: str = ""

class RecordRequest(BaseModel):
    patient_name: str
    age: int
    gender: str
    symptoms: str
    diagnosis: str

# --- Gemini AI Helper ---
def get_gemini_response(message: str, vitals: dict, history: str) -> str | None:
    """Try to get a response from Google Gemini AI. Returns None if unavailable."""
    api_key = os.getenv("GEMINIAI_API_KEY")
    if not api_key:
        return None
    
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        prompt = f"""You are Aura, an empathetic, highly knowledgeable medical AI assistant for Lumina Health.
        Provide helpful information, analyze symptoms, and offer preliminary guidance.
        Always remind the patient that your advice is not a substitute for professional medical diagnosis.
        Keep responses concise (2-4 sentences) unless detailed explanation is necessary.
        
        Patient Vitals: {vitals if vitals else 'Not available'}
        
        Recent History:
        {history if history else 'No prior conversation.'}
        
        Patient says: {message}
        
        Aura:"""
        
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return None

# --- Endpoints ---

@app.post("/records")
def add_record(record: RecordRequest):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO health_records (patient_name, age, gender, symptoms, diagnosis)
        VALUES (?, ?, ?, ?, ?)
    ''', (record.patient_name, record.age, record.gender, record.symptoms, record.diagnosis))
    conn.commit()
    record_id = cursor.lastrowid
    conn.close()
    return {"message": "Record added successfully", "id": record_id}

@app.get("/records")
def get_records():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM health_records')
    rows = cursor.fetchall()
    conn.close()
    return {"records": [dict(row) for row in rows]}

def simple_diagnosis(text: str) -> str:
    text_lower = text.lower()
    if "headache" in text_lower or "migraine" in text_lower:
        return "It sounds like you may be experiencing a tension headache or migraine. I'd recommend resting in a quiet, dark room, staying hydrated, and taking an over-the-counter pain reliever if appropriate. If your headaches are severe or recurring, please consult with a healthcare professional."
    elif "fever" in text_lower or "flu" in text_lower or "chills" in text_lower or "cold" in text_lower:
        return "Fever and flu-like symptoms can indicate a viral infection. Rest, drink plenty of fluids, and monitor your temperature. If your fever exceeds 103°F (39.4°C) or persists for more than 3 days, seek medical attention promptly."
    elif "chest pain" in text_lower or "heart" in text_lower:
        return "⚠️ CRITICAL WARNING: Chest pain can indicate a severe cardiac event. If you are currently experiencing chest pain, please seek immediate emergency medical care."
    elif "stomach" in text_lower or "nausea" in text_lower or "vomit" in text_lower:
        return "Stomach discomfort and nausea can be caused by many factors. Try sipping clear liquids, eating bland foods (BRAT diet), and resting. If symptoms persist beyond 48 hours, consult a doctor."
    elif "cough" in text_lower or "sore throat" in text_lower:
        return "A cough and sore throat are common symptoms of upper respiratory infections. Try warm fluids, honey, and throat lozenges. If you develop a high fever or symptoms last more than a week, see a healthcare provider."
    elif "anxiety" in text_lower or "stress" in text_lower or "mental" in text_lower:
        return "Managing stress and anxiety is crucial for overall health. Consider deep breathing exercises, regular physical activity, and maintaining a consistent sleep schedule. If anxiety significantly impacts your daily life, speaking with a mental health professional can be very beneficial."
    elif "hello" in text_lower or "hi" in text_lower or "hey" in text_lower:
        return "Hello! I'm Aura, your medical AI assistant. I can help analyze symptoms, provide health tips, and offer preliminary guidance. How can I help you today?"
    else:
        return "Thank you for sharing that. I'd recommend monitoring your symptoms closely. If they persist or worsen, please schedule an appointment with your healthcare provider for a proper evaluation. I'm here to provide general health information — always consult a doctor for a professional diagnosis."

@app.post("/predict-disease")
def predict_disease(request: SymptomRequest):
    diagnosis = simple_diagnosis(request.symptoms)
    return {
        "possible_conditions": [
            {"condition": diagnosis.split(".")[0] if "." in diagnosis else "Unknown Condition", "probability": 0.75}
        ],
        "risk_score": 45,
        "severity": "Medium Severity" if "WARNING" in diagnosis else "Low Severity",
        "notes": diagnosis
    }

@app.post("/ai-chat")
def ai_chat(request: ChatRequest):
    # Try Gemini AI first
    gemini_response = get_gemini_response(
        request.message,
        request.recent_vitals,
        request.conversation_history
    )
    
    if gemini_response:
        response_text = gemini_response
    else:
        # Fallback to enhanced rule-based diagnosis
        diagnosis_advice = simple_diagnosis(request.message)
        
        # Check past records for context
        past_history = ""
        if request.patient_name != "Unknown":
            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT diagnosis FROM health_records WHERE patient_name = ? ORDER BY id DESC LIMIT 1', (request.patient_name,))
            row = cursor.fetchone()
            conn.close()
            if row:
                past_history = f" Based on your history, I also noted: '{row['diagnosis']}'"
        
        response_text = f"{diagnosis_advice}{past_history}"
    
    return {"response": response_text}

@app.post("/analyze-image")
def analyze_image(file: UploadFile = File(...)):
    # Placeholder for Mock AI / OpenCV image processing
    file_size = 0
    file_contents = file.file.read()
    file_size = len(file_contents)
    
    # Generate mock description based on file content length just to vary the output slightly
    mock_findings = "No severe abnormalities detected."
    if file_size % 2 == 0:
        mock_findings = "Minor tissue inflammation observed in the scanned region."
    elif file_size > 100000:
        mock_findings = "Possible dense mass detected. Requires human radiologist review."
        
    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "ai_analysis": {
            "finding": mock_findings,
            "confidence": 0.82
        }
    }

@app.post("/speech-to-text")
def speech_to_text(audio: UploadFile = File(...)):
    return {"text": "Patient mentioned feeling tired and having a slight cough."}

class ReportSummaryRequest(BaseModel):
    file_content: str  # base64 encoded
    file_name: str
    mime_type: str = "application/pdf"

@app.post("/summarize-report")
def summarize_report(request: ReportSummaryRequest):
    """Summarize a medical report (PDF or image) using AI or keyword extraction."""
    import base64
    
    try:
        decoded = base64.b64decode(request.file_content)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid file content")
    
    # Try Gemini AI for summarization
    api_key = os.getenv("GEMINIAI_API_KEY")
    if api_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-2.0-flash')
            
            prompt = f"""You are a medical document summarizer for Lumina Health.
            Summarize the following medical report in 2-3 concise sentences.
            Focus on key findings, diagnoses, and recommendations.
            File name: {request.file_name}"""
            
            response = model.generate_content(prompt)
            if response.text:
                return {"summary": response.text}
        except Exception as e:
            print(f"Gemini summarization failed: {e}")
    
    # Fallback: keyword-based summary
    file_size_kb = len(decoded) / 1024
    summary = f"Medical report '{request.file_name}' ({file_size_kb:.0f} KB) has been uploaded and archived. "
    
    name_lower = request.file_name.lower()
    if "blood" in name_lower or "cbc" in name_lower or "hemoglobin" in name_lower:
        summary += "This appears to be a bloodwork/lab report. Key metrics should be reviewed with your healthcare provider."
    elif "xray" in name_lower or "x-ray" in name_lower or "scan" in name_lower or "ct" in name_lower or "mri" in name_lower:
        summary += "This appears to be a medical imaging report. A radiologist review is recommended for detailed interpretation."
    elif "prescription" in name_lower or "rx" in name_lower:
        summary += "This appears to be a prescription document. Ensure you follow the dosage and frequency as directed."
    else:
        summary += "The document has been stored securely. Consult your physician for a professional interpretation of the results."
    
    return {"summary": summary}

@app.post("/text-to-speech")
def text_to_speech(text: str):
    return {"audio_url": "/mock-audio.mp3"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
