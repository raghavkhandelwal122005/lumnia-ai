import express from 'express';
import { getReports, uploadReport, reportUpload } from '../controllers/reportController';
import { authenticateToken } from '../utils/auth';

const router = express.Router();

router.get('/', authenticateToken, getReports);
router.post('/upload', authenticateToken, reportUpload.single('file'), uploadReport);

export default router;
