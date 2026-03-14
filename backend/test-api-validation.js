const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: 'c:/Users/LENOVO/Desktop/health-care-ai-main/backend/.env' });

async function testApiKey() {
  const key = process.env.GEMINIAI_API_KEY;
  if (!key) {
    console.error("API Key not found in .env");
    return;
  }
  
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  try {
    const result = await model.generateContent("Say 'Success'");
    const response = await result.response;
    console.log("Result:", response.text().trim());
  } catch (error) {
    console.error("API Key Test Failed:", error.message);
  }
}

testApiKey();
