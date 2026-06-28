import express from 'express';
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
