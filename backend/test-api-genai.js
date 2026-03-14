const { GoogleGenAI } = require("@google/genai");
require('dotenv').config({ path: 'c:/Users/LENOVO/Desktop/health-care-ai-main/backend/.env' });

async function testApiKeyGenAI() {
  const key = process.env.GEMINIAI_API_KEY;
  if (!key) {
    console.error("API Key not found in .env");
    return;
  }
  
  const ai = new GoogleGenAI({ apiKey: key });

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: "Say 'Success from GenAI 2.5 flash'",
    });
    console.log("Result:", response.text);
  } catch (error) {
    console.error("API Key Test Failed:", error.message);
  }
}

testApiKeyGenAI();
