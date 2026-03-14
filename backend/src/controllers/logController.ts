import { Response } from 'express';
import { AuthRequest } from '../utils/auth';
import { pool } from '../db';

export const createLog = async (req: AuthRequest, res: Response) => {
    try {
        const { symptoms, notes, type, bp_sys, bp_dia, heart_rate, sugar_level, weight } = req.body;
        const userId = req.user.id;

        const result = await pool.query(
            `INSERT INTO HealthLogs 
            (user_id, type, symptoms, notes, bp_sys, bp_dia, heart_rate, sugar_level, weight) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [userId, type || 'General', symptoms, notes, bp_sys, bp_dia, heart_rate, sugar_level, weight]
        );

        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const getLogs = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.id;
        const result = await pool.query('SELECT * FROM HealthLogs WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        res.json(result.rows);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};
