import express from 'express';
import {
  getDashboardStats,
  getCalendarStats,
  getHistoryDay,
} from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect); // Secure stats routes

router.get('/dashboard', getDashboardStats);
router.get('/calendar', getCalendarStats);
router.get('/history/:dateStr', getHistoryDay);

export default router;
