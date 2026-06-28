import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routers
import authRouter from './routes/auth.js';
import schedulesRouter from './routes/schedules.js';
import reportsRouter from './routes/reports.js';
import notificationsRouter from './routes/notifications.js';

// Load env variables
dotenv.config();

const app = express();

// Middlewares
app.use(cors({
  origin: '*', // Allow requests from all origins (Vite app by default is on 5173 or other)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' })); // Support base64 image uploads in profile

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/notifications', notificationsRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Port and DB Connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tasktrackerpro';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    if (!process.env.VERCEL) {
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
      });
    }
  })
  .catch((err) => {
    console.error('Database connection error:', err);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  });

export default app;
