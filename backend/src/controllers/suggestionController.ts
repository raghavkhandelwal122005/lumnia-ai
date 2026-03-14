import { Response } from 'express';
import { AuthRequest } from '../utils/auth';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

export const generateSuggestions = async (req: AuthRequest, res: Response) => {
    try {
        const { vitals, logs } = req.body;

        if (!process.env.GEMINIAI_API_KEY) {
            console.error("Missing Gemini API Key in backend env!");
            return res.status(500).json({ error: "Gemini API Key missing from backend" });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINIAI_API_KEY as string });

        const prompt = `You are Lumina Health, an AI providing concise, actionable health advice.
        Review the user's latest vitals and recent logs to provide 2-3 short, friendly suggestions.

        Vitals:
        ${JSON.stringify(vitals, null, 2)}
        
        Recent Logs:
        ${JSON.stringify(logs.slice(0, 5), null, 2)}

        Provide your suggestions strictly as a JSON array of strings, with no markdown formatting.
        Example: ["Drink more water today based on your resting heart rate.", "Your sleep is low, try to get 8 hours tonight."]`;

        let suggestions = [];
        try {
            const result = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: prompt,
            });

            const responseText = result.text ?? '[]';
            const cleanJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            suggestions = JSON.parse(cleanJsonStr);
        } catch (geminiErr: any) {
            console.error("Gemini AI API Error in suggestions fallback logic:", geminiErr.message);
            // Contextual rules-based suggestions when API key fails
            const hr = vitals.restingHeartRate ? parseInt(vitals.restingHeartRate) : 0;
            const spo2 = vitals.bloodOxygen ? parseInt(vitals.bloodOxygen) : 0;
            const sleep = vitals.sleepHours ? parseInt(vitals.sleepHours) : 0;
            const bpSys = vitals.bloodPressureSys ? parseInt(vitals.bloodPressureSys) : 0;
            const bpDia = vitals.bloodPressureDia ? parseInt(vitals.bloodPressureDia) : 0;
            const sugarLevel = vitals.sugarLevel ? parseInt(vitals.sugarLevel) : 0;
            const activity = vitals.activityScore ? parseInt(vitals.activityScore) : 0;

            if (spo2 > 0 && spo2 < 95) {
                suggestions.push(`⚠️ Your blood oxygen (SpO₂) is ${spo2}% — below the safe threshold. Practice slow, deep diaphragmatic breathing and avoid lying flat. If it drops below 92%, seek immediate medical attention.`);
            } else if (spo2 >= 95 && spo2 < 98) {
                suggestions.push(`Your SpO₂ is ${spo2}% — within safe range but slightly below ideal. Ensure you're in a well-ventilated area and consider light breathing exercises.`);
            }

            if (hr > 100) {
                suggestions.push(`💓 Your resting heart rate is ${hr} BPM — above normal (60–100). Avoid caffeine, stay hydrated, and practice 5 minutes of box breathing: inhale 4s, hold 4s, exhale 4s, hold 4s.`);
            } else if (hr > 90) {
                suggestions.push(`Your resting heart rate is ${hr} BPM — slightly elevated. Try a 10-minute walk, reduce screen time before bed, and aim to add a short evening wind-down routine.`);
            } else if (hr > 0 && hr < 55) {
                suggestions.push(`Your resting heart rate is ${hr} BPM — lower than usual. Unless you're a trained athlete, monitor for dizziness or fatigue and consult a doctor if you feel unwell.`);
            }

            if (sleep > 0 && sleep < 6) {
                suggestions.push(`😴 You only got ${sleep}h of sleep — significantly below the recommended 7–9 hours. Poor sleep raises cortisol and weakens immunity. Tonight, put your phone away 30 minutes early and keep your room cool at ~18°C.`);
            } else if (sleep >= 6 && sleep < 7) {
                suggestions.push(`You got ${sleep}h of sleep — close, but try to squeeze in one more hour. A consistent bedtime makes a huge difference in energy, mood, and cardiovascular health.`);
            }

            if (bpSys > 140 || bpDia > 90) {
                suggestions.push(`🩺 Your blood pressure (${bpSys}/${bpDia} mmHg) is in the high range. Reduce sodium intake (aim for under 2g/day), avoid alcohol, and walk 20–30 minutes today. Schedule a follow-up with your doctor.`);
            } else if (bpSys > 120 || bpDia > 80) {
                suggestions.push(`Your BP (${bpSys}/${bpDia} mmHg) is slightly elevated. A diet rich in potassium (bananas, leafy greens) and regular aerobic movement can help bring it back to optimal range.`);
            }

            if (sugarLevel > 200) {
                suggestions.push(`🍬 Blood sugar at ${sugarLevel} mg/dL is very high. Avoid sugary drinks and refined carbs today. A 15-minute walk post-meal helps cells absorb glucose more effectively. Consult your doctor soon.`);
            } else if (sugarLevel > 140) {
                suggestions.push(`Your blood sugar (${sugarLevel} mg/dL) is above the normal fasting range. Favor low-glycemic foods like oats, legumes, and vegetables. Avoid eating within 2 hours of bedtime.`);
            }

            if (activity > 0 && activity < 40) {
                suggestions.push(`🏃 Your activity score is ${activity}/100 — quite low. Even a 20-minute brisk walk can boost your mood, circulation, and immune function. Try scheduling movement right after meals.`);
            } else if (activity >= 40 && activity < 60) {
                suggestions.push(`Your activity score (${activity}/100) shows moderate movement. Great start! Adding one or two extra sessions of 15 minutes this week can significantly improve cardiovascular resilience.`);
            }

            if (suggestions.length === 0) {
                // Genuinely good vitals — give aspirational wellness tips
                suggestions.push("✅ Your vitals look great! To maintain this, drink at least 2L of water today and include 20 minutes of moderate exercise.");
                suggestions.push("🥗 Consider a Mediterranean-style meal today: olive oil, fish, vegetables, and whole grains. This dietary pattern is linked to 30% lower cardiovascular risk.");
                suggestions.push("🌿 Great health is maintained through consistency. Log your vitals weekly so the AI can track trends and catch early warning signs.");
            }
        }

        res.json({ suggestions });
    } catch (err: any) {
        console.error("Suggestion Generator Error:", err);
        res.status(500).json({ error: err.message });
    }
};
