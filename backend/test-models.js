const axios = require('axios');
require('dotenv').config({ path: 'c:/Users/LENOVO/Desktop/health-care-ai-main/backend/.env' });

async function listModels() {
  const key = process.env.GEMINIAI_API_KEY;
  try {
    const res = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    console.log("Models:", res.data.models.map(m => m.name));
  } catch (err) {
    if (err.response) {
      console.error("Error Response:", err.response.data);
    } else {
      console.error("Error:", err.message);
    }
  }
}

listModels();
