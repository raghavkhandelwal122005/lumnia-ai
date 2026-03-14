import express from 'express';
import { generateSuggestions } from '../controllers/suggestionController';
import { authenticateToken } from '../utils/auth';

const router = express.Router();

router.post('/generate', authenticateToken, generateSuggestions);

export default router;
