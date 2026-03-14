import { Response } from 'express';
import { AuthRequest } from '../utils/auth';
import { pool } from '../db';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const chatWithAI = async (req: AuthRequest, res: Response) => {
    try {
        const { message, recentVitals } = req.body;
        const userId = req.user?.id || 'Unknown';

        // 1. Retrieve the last 6 messages for context
        const historyResult = await pool.query(
            'SELECT role, content FROM chat_messages WHERE user_id = $1 ORDER BY created_at ASC LIMIT 6',
            [userId]
        );

        let conversationHistory = "";
        historyResult.rows.forEach(row => {
            conversationHistory += `${row.role === 'user' ? 'Patient' : 'Aura'}: ${row.content}\n`;
        });

        // 2. Call the Python AI service for chat response
        let botResponseText = "I apologize, but I could not generate a response at this time.";

        try {
            const aiResponse = await axios.post(`${AI_SERVICE_URL}/ai-chat`, {
                message: message,
                patient_name: "Patient",
                recent_vitals: recentVitals || {},
                conversation_history: conversationHistory,
            }, { timeout: 30000 });

            botResponseText = aiResponse.data.response;
        } catch (aiErr: any) {
            console.error("AI Service Error:", aiErr.message);
            // Fallback: basic rule-based response
            botResponseText = generateFallbackResponse(message);
        }

        // 3. Save User Message
        await pool.query(
            "INSERT INTO chat_messages (user_id, role, content) VALUES ($1, 'user', $2)",
            [userId, message]
        );

        // 4. Save Bot Response
        await pool.query(
            "INSERT INTO chat_messages (user_id, role, content) VALUES ($1, 'assistant', $2)",
            [userId, botResponseText]
        );

        res.json({ response: botResponseText });
    } catch (err: any) {
        console.error("Chat API Error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

function generateFallbackResponse(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('headache') || lower.includes('migraine'))
        return "It sounds like you may be experiencing a tension headache or migraine. I'd recommend resting in a quiet, dark room, staying hydrated, and taking an over-the-counter pain reliever if appropriate. If your headaches are severe or recurring, please consult with a healthcare professional. Remember, this is general advice — not a medical diagnosis.";
    if (lower.includes('fever') || lower.includes('flu') || lower.includes('cold'))
        return "Fever and flu-like symptoms can indicate a viral infection. Rest, drink plenty of fluids, and monitor your temperature. If your fever exceeds 103°F (39.4°C) or persists for more than 3 days, seek medical attention promptly. This is informational advice only.";
    if (lower.includes('chest pain') || lower.includes('heart'))
        return "⚠️ Chest pain can be a sign of a serious condition. If you are currently experiencing chest pain, tightness, or shortness of breath, please call emergency services immediately. Do not delay seeking medical help.";
    if (lower.includes('stomach') || lower.includes('nausea') || lower.includes('vomit'))
        return "Stomach discomfort and nausea can be caused by many factors including food poisoning, gastritis, or stress. Try sipping clear liquids, eating bland foods (BRAT diet), and resting. If symptoms are severe or persist beyond 48 hours, consult a doctor.";
    if (lower.includes('cough') || lower.includes('sore throat'))
        return "A cough and sore throat are common symptoms of upper respiratory infections. Try warm fluids, honey (if not allergic), and throat lozenges. If you develop a high fever, difficulty breathing, or symptoms last more than a week, see a healthcare provider.";
    if (lower.includes('anxiety') || lower.includes('stress') || lower.includes('mental'))
        return "Managing stress and anxiety is crucial for overall health. Consider deep breathing exercises, regular physical activity, and maintaining a consistent sleep schedule. If anxiety significantly impacts your daily life, speaking with a mental health professional can be very beneficial.";
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey'))
        return "Hello! I'm Aura, your medical assistant. I can help analyze your symptoms, provide health tips, and offer preliminary guidance. How can I help you today?";
    return "Thank you for sharing that with me. Based on what you've described, I'd recommend monitoring your symptoms closely. If they persist or worsen, please schedule an appointment with your healthcare provider for a proper evaluation. Remember, I'm here to provide general health information — always consult a doctor for a professional diagnosis.";
}
