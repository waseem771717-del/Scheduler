import express from 'express';
import { getDueNotifications } from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/due', protect, getDueNotifications);

export default router;
