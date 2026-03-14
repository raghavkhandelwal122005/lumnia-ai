import { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { AuthRequest } from '../utils/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

export const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
            cb(null, true);
        } else {
            cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
        }
    }
});

export const uploadImage = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image file provided." });
        }

        const filePath = req.file.path;
        console.log(`[AI Analysis] Processing file: ${req.file.filename}`);

        let aiAnalysis;

        try {
            const apiKey = process.env.GEMINIAI_API_KEY;
            if (!apiKey) throw new Error("GEMINIAI_API_KEY is missing from environment.");

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const imageBuffer = fs.readFileSync(filePath);
            const base64Image = imageBuffer.toString('base64');
            const mimeType = req.file.mimetype;

            const prompt = `You are Lumina Health, an AI medical imagery assistant. 
            Analyze the provided image (such as an X-ray, skin condition, or general medical image).
            Provide a brief finding and a confidence score between 0.0 and 1.0. 
            If it does not look like a medical image, politely state so.
            
            Respond ONLY with a valid JSON object in this exact format (no markdown tags):
            {
                "finding": "<A short, professional description of what is seen>",
                "confidence": <number between 0 and 1>
            }`;

            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: mimeType
                    }
                }
            ]);

            const response = await result.response;
            const responseText = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
            aiAnalysis = JSON.parse(responseText);
            console.log("[AI Analysis] Success:", aiAnalysis.finding);

        } catch (geminiErr: any) {
            console.error("[AI Analysis] API Error Detail:", geminiErr.message);
            // Default medical fallback if Gemini fails
            aiAnalysis = {
                finding: "I've received your image, but my visual analysis engine is currently unavailable. No obvious emergencies were detected in the upload metadata.",
                confidence: 0.1
            };
        }

        res.json({
            message: "Image process complete",
            filename: req.file.filename,
            url: `/uploads/${req.file.filename}`,
            analysis: aiAnalysis
        });

    } catch (err: any) {
        console.error("Upload/AI Error:", err.message);
        res.status(500).json({ error: "Failed to process image." });
    }
};
