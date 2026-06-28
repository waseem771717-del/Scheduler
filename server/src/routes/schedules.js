import express from 'express';
import {
  createOrUpdateSpecialDay,
  getSpecialDay,
  createOrUpdateWeekly,
  getWeeklyTemplate,
  getWeeklyInstance,
  toggleTask,
  duplicateDaySchedule,
  duplicateWeekSchedule,
} from '../controllers/scheduleController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect); // All schedule routes require auth

router.post('/special', createOrUpdateSpecialDay);
router.get('/special', getSpecialDay);
router.post('/weekly', createOrUpdateWeekly);
router.get('/weekly', getWeeklyTemplate);
router.get('/weekly/instance', getWeeklyInstance);
router.put('/tasks/:taskId', toggleTask);
router.post('/duplicate-day', duplicateDaySchedule);
router.post('/duplicate-week', duplicateWeekSchedule);

export default router;
