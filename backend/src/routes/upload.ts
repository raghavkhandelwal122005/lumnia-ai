import express from 'express';
import { authenticateToken } from '../utils/auth';
import { upload, uploadImage } from '../controllers/uploadController';

const router = express.Router();

// Temporary remove generic auth check if the frontend isn't fully integrated yet
router.post('/image', upload.single('image'), uploadImage as any);
router.post('/', upload.single('image'), uploadImage as any);

export default router;
