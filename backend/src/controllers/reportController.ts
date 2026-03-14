import { Response } from 'express';
import { AuthRequest } from '../utils/auth';
import { pool } from '../db';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/reports');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

export const reportUpload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, JPG, and PNG files are allowed.'));
        }
    },
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

export const getReports = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(
            'SELECT * FROM Predictions WHERE user_id = $1 ORDER BY id DESC',
            [userId]
        );
        res.json(result.rows);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const uploadReport = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file provided." });
        }

        const { title, category } = req.body;
        const filePath = req.file.path;
        const fileName = req.file.originalname;
        const mimeType = req.file.mimetype;

        let summary = "Document uploaded successfully. AI analysis pending.";

        // If it's a PDF, try to extract text and get AI summary
        if (mimeType === 'application/pdf') {
            try {
                // Read the file and send to Python ai-service for summarization
                const fileBuffer = fs.readFileSync(filePath);
                const base64File = fileBuffer.toString('base64');
                
                const aiResponse = await axios.post('http://localhost:8000/summarize-report', {
                    file_content: base64File,
                    file_name: fileName,
                    mime_type: mimeType,
                }, { timeout: 30000 });

                summary = aiResponse.data.summary || summary;
            } catch (aiErr: any) {
                console.error("AI Report Summary Error:", aiErr.message);
                summary = "Document uploaded. AI summarization unavailable — the report has been saved for manual review.";
            }
        } else {
            // For images, provide a simple acknowledgment
            summary = `Medical image (${fileName}) uploaded successfully. View the image in your reports archive for reference.`;
        }

        res.json({
            message: "Report uploaded successfully",
            report: {
                title: title || fileName,
                category: category || 'Other',
                source: 'File Upload',
                summary: summary,
                filename: req.file.filename,
                date: new Date().toISOString()
            }
        });

    } catch (err: any) {
        console.error("Upload Report Error:", err.message);
        res.status(500).json({ error: "Failed to process report." });
    }
};
